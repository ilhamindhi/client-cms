"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Plus, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import { sendToUsers } from "@/lib/api/broadcasts";
import { listAdminUsers } from "@/lib/api/auth";
import {
  createNotificationTemplateAdmin,
  disableNotificationTemplateAdmin,
  dispatchPushQueueAdmin,
  listNotificationTemplatesAdmin,
  pushNotificationBroadcastAdmin,
  pushNotificationFromTemplateBroadcastAdmin,
  pushNotificationFromTemplateAdmin,
  updateNotificationTemplateAdmin,
} from "@/lib/api/notifications";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AdminUser } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type NotificationChannel = "in_app" | "email" | "push";
type NotificationAudienceScope = "active_users" | "all_users";
type RecipientPayload =
  | { user_ids: string[]; user_identifiers?: never }
  | { user_identifiers: Array<{ username?: string; email?: string; phone?: string }>; user_ids?: never };
type CreateModalType =
  | "create_template"
  | "push_manual"
  | "push_template"
  | "broadcast_manual"
  | "broadcast_template";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_PATTERN = /^\+?[0-9]{6,20}$/;

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseChannel(value: unknown, fallback: NotificationChannel = "in_app"): NotificationChannel {
  if (value === "email" || value === "push" || value === "in_app") return value;
  return fallback;
}

function parseAudienceScope(
  value: unknown,
  fallback: NotificationAudienceScope = "active_users"
): NotificationAudienceScope {
  if (value === "all_users" || value === "active_users") return value;
  return fallback;
}

function asBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseRecipientInput(raw: string): RecipientPayload {
  const value = raw.trim();
  if (UUID_PATTERN.test(value)) {
    return { user_ids: [value] };
  }
  if (value.includes("@")) {
    return { user_identifiers: [{ email: value.toLowerCase() }] };
  }
  if (PHONE_PATTERN.test(value)) {
    return { user_identifiers: [{ phone: value }] };
  }
  return { user_identifiers: [{ username: value }] };
}

function parseTemplateRecipientInput(raw: string) {
  const value = raw.trim();
  if (UUID_PATTERN.test(value)) {
    return { user_id: value };
  }
  if (value.includes("@")) {
    return { user_identifier: { email: value.toLowerCase() } };
  }
  if (PHONE_PATTERN.test(value)) {
    return { user_identifier: { phone: value } };
  }
  return { user_identifier: { username: value } };
}

function normalizePhone(value: string) {
  return value.replace(/[^0-9+]/g, "");
}

function resolveLookupUserLabel(user: AdminUser) {
  return user.display_name || user.username || user.email;
}

function resolveLookupUserMeta(user: AdminUser) {
  const parts = [user.email];
  if (user.username) parts.push(`@${user.username}`);
  if (user.phone) parts.push(user.phone);
  return parts.join(" | ");
}

function userMatchesQuery(user: AdminUser, raw: string) {
  const query = raw.trim().toLowerCase();
  if (!query) return false;
  return [user.id, user.email, user.username, user.phone, user.display_name]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(query));
}

function userMatchesExactIdentifier(user: AdminUser, raw: string) {
  const query = raw.trim();
  if (!query) return false;
  if (UUID_PATTERN.test(query)) {
    return user.id.toLowerCase() === query.toLowerCase();
  }
  if (query.includes("@")) {
    return user.email.toLowerCase() === query.toLowerCase();
  }
  if (PHONE_PATTERN.test(normalizePhone(query))) {
    return normalizePhone(user.phone ?? "") === normalizePhone(query);
  }
  return (user.username ?? "").toLowerCase() === query.toLowerCase();
}

const CREATE_MODAL_META: Record<CreateModalType, { title: string; description: string }> = {
  create_template: {
    title: "Buat Template",
    description: "Buat template yang bisa dipakai berulang untuk notifikasi.",
  },
  push_manual: {
    title: "Kirim Personal (Manual)",
    description: "Kirim ke 1 user dengan ID/username/email/nomor HP.",
  },
  push_template: {
    title: "Kirim Personal dari Template",
    description: "Kirim template ke user tertentu.",
  },
  broadcast_manual: {
    title: "Kirim Massal (Manual)",
    description: "Kirim massal ke user aktif atau semua user.",
  },
  broadcast_template: {
    title: "Kirim Massal dari Template",
    description: "Kirim template secara massal.",
  },
};

const CHANNEL_OPTIONS: Array<{
  value: NotificationChannel;
  label: string;
  hint: string;
}> = [
  {
    value: "in_app",
    label: "Inbox Aplikasi (In-App)",
    hint: "Pesan hanya masuk ke inbox notifikasi di aplikasi.",
  },
  {
    value: "email",
    label: "Email",
    hint: "Pesan dikirim ke email user yang terdaftar.",
  },
  {
    value: "push",
    label: "Push ke Perangkat",
    hint: "Notifikasi popup ke perangkat user (butuh token FCM aktif).",
  },
];

const CHANNEL_HINT_MAP: Record<NotificationChannel, string> = {
  in_app: CHANNEL_OPTIONS[0].hint,
  email: CHANNEL_OPTIONS[1].hint,
  push: CHANNEL_OPTIONS[2].hint,
};

const AUDIENCE_OPTIONS: Array<{ value: NotificationAudienceScope; label: string }> = [
  { value: "active_users", label: "User Aktif" },
  { value: "all_users", label: "Semua User" },
];

function resolveChannelLabel(value: unknown) {
  if (value === "in_app") return CHANNEL_OPTIONS[0].label;
  if (value === "email") return CHANNEL_OPTIONS[1].label;
  if (value === "push") return CHANNEL_OPTIONS[2].label;
  if (typeof value === "string" && value.trim()) return value;
  return "-";
}

export default function NotificationsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [activeCreateModal, setActiveCreateModal] = useState<CreateModalType | null>(null);

  const [code, setCode] = useState("");
  const [titleTemplate, setTitleTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("in_app");

  const [pushUserId, setPushUserId] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushChannel, setPushChannel] = useState<NotificationChannel>("in_app");

  const [templateUserId, setTemplateUserId] = useState("");
  const [templateCode, setTemplateCode] = useState("");
  const [templateChannel, setTemplateChannel] = useState<NotificationChannel>("in_app");

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastChannel, setBroadcastChannel] = useState<NotificationChannel>("in_app");
  const [broadcastAudienceScope, setBroadcastAudienceScope] =
    useState<NotificationAudienceScope>("active_users");
  const [broadcastRecipientLimit, setBroadcastRecipientLimit] = useState("10000");
  const [broadcastDispatchNow, setBroadcastDispatchNow] = useState(false);

  const [broadcastTemplateCode, setBroadcastTemplateCode] = useState("");
  const [broadcastTemplateChannel, setBroadcastTemplateChannel] =
    useState<NotificationChannel>("in_app");
  const [broadcastTemplateAudienceScope, setBroadcastTemplateAudienceScope] =
    useState<NotificationAudienceScope>("active_users");
  const [broadcastTemplateRecipientLimit, setBroadcastTemplateRecipientLimit] = useState("10000");
  const [broadcastTemplateDispatchNow, setBroadcastTemplateDispatchNow] = useState(false);

  const [dispatchLimit, setDispatchLimit] = useState("100");
  const [dispatchMaxAttempts, setDispatchMaxAttempts] = useState("5");

  const [templateEditModalOpen, setTemplateEditModalOpen] = useState(false);
  const [templateEditModalSaving, setTemplateEditModalSaving] = useState(false);
  const [templateEditCode, setTemplateEditCode] = useState("");
  const [templateEditTitle, setTemplateEditTitle] = useState("");
  const [templateEditBody, setTemplateEditBody] = useState("");
  const [templateEditChannel, setTemplateEditChannel] = useState<NotificationChannel>("in_app");
  const [templateEditActive, setTemplateEditActive] = useState(true);

  const [pushLookupRows, setPushLookupRows] = useState<AdminUser[]>([]);
  const [pushLookupLoading, setPushLookupLoading] = useState(false);
  const [pushLookupHint, setPushLookupHint] = useState("");
  const [pushSelectedUser, setPushSelectedUser] = useState<AdminUser | null>(null);

  const [templateLookupRows, setTemplateLookupRows] = useState<AdminUser[]>([]);
  const [templateLookupLoading, setTemplateLookupLoading] = useState(false);
  const [templateLookupHint, setTemplateLookupHint] = useState("");
  const [templateSelectedUser, setTemplateSelectedUser] = useState<AdminUser | null>(null);

  const pushLookupRunRef = useRef(0);
  const templateLookupRunRef = useRef(0);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Notifikasi",
    successTitle: "Notifikasi",
  });

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  function closeCreateModal() {
    setActiveCreateModal(null);
  }

  const lookupRecipientUsers = useCallback(
    async (keyword: string) => {
      if (!accessToken) return [] as AdminUser[];
      const query = keyword.trim();
      if (!query) return [] as AdminUser[];
      const users = await listAdminUsers(accessToken, {
        q: query,
        limit: 8,
      });
      const filtered = users.filter((user) => userMatchesQuery(user, query));
      return filtered.length > 0 ? filtered : users;
    },
    [accessToken]
  );

  async function loadTemplates() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const rows = await listNotificationTemplatesAdmin(accessToken);
      setTemplates(rows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  useEffect(() => {
    const raw = pushUserId.trim();
    const isOpen = activeCreateModal === "push_manual";

    if (!isOpen || !accessToken) {
      setPushLookupRows([]);
      setPushLookupHint("");
      setPushLookupLoading(false);
      return;
    }

    if (!raw) {
      setPushLookupRows([]);
      setPushLookupHint("");
      setPushLookupLoading(false);
      return;
    }

    if (UUID_PATTERN.test(raw)) {
      setPushLookupRows([]);
      setPushLookupLoading(false);
      setPushLookupHint("UUID terdeteksi. Notifikasi akan dikirim ke user_id tersebut.");
      return;
    }

    if (raw.length < 2) {
      setPushLookupRows([]);
      setPushLookupLoading(false);
      setPushLookupHint("Ketik minimal 2 karakter untuk cari user.");
      return;
    }

    const currentRun = ++pushLookupRunRef.current;
    const timer = globalThis.setTimeout(async () => {
      setPushLookupLoading(true);
      try {
        const rows = await lookupRecipientUsers(raw);
        if (currentRun !== pushLookupRunRef.current) return;

        setPushLookupRows(rows);
        const exactMatch = rows.find((user) => userMatchesExactIdentifier(user, raw)) ?? null;
        if (exactMatch) {
          setPushSelectedUser(exactMatch);
          setPushLookupHint(
            `User otomatis terdeteksi: ${resolveLookupUserLabel(exactMatch)} (${exactMatch.id})`
          );
          return;
        }

        if (rows.length === 1) {
          setPushSelectedUser(rows[0] ?? null);
          setPushLookupHint(`1 user ditemukan: ${resolveLookupUserLabel(rows[0] as AdminUser)}.`);
          return;
        }

        setPushLookupHint(rows.length > 1 ? "Pilih user dari daftar hasil." : "User tidak ditemukan.");
      } catch (error) {
        if (currentRun !== pushLookupRunRef.current) return;
        setPushLookupRows([]);
        setPushLookupHint(error instanceof Error ? error.message : "Gagal fetch user.");
      } finally {
        if (currentRun === pushLookupRunRef.current) {
          setPushLookupLoading(false);
        }
      }
    }, 320);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [accessToken, activeCreateModal, lookupRecipientUsers, pushUserId]);

  useEffect(() => {
    const raw = templateUserId.trim();
    const isOpen = activeCreateModal === "push_template";

    if (!isOpen || !accessToken) {
      setTemplateLookupRows([]);
      setTemplateLookupHint("");
      setTemplateLookupLoading(false);
      return;
    }

    if (!raw) {
      setTemplateLookupRows([]);
      setTemplateLookupHint("");
      setTemplateLookupLoading(false);
      return;
    }

    if (UUID_PATTERN.test(raw)) {
      setTemplateLookupRows([]);
      setTemplateLookupLoading(false);
      setTemplateLookupHint("UUID terdeteksi. Template notifikasi akan dikirim ke user_id tersebut.");
      return;
    }

    if (raw.length < 2) {
      setTemplateLookupRows([]);
      setTemplateLookupLoading(false);
      setTemplateLookupHint("Ketik minimal 2 karakter untuk cari user.");
      return;
    }

    const currentRun = ++templateLookupRunRef.current;
    const timer = globalThis.setTimeout(async () => {
      setTemplateLookupLoading(true);
      try {
        const rows = await lookupRecipientUsers(raw);
        if (currentRun !== templateLookupRunRef.current) return;

        setTemplateLookupRows(rows);
        const exactMatch = rows.find((user) => userMatchesExactIdentifier(user, raw)) ?? null;
        if (exactMatch) {
          setTemplateSelectedUser(exactMatch);
          setTemplateLookupHint(
            `User otomatis terdeteksi: ${resolveLookupUserLabel(exactMatch)} (${exactMatch.id})`
          );
          return;
        }

        if (rows.length === 1) {
          setTemplateSelectedUser(rows[0] ?? null);
          setTemplateLookupHint(`1 user ditemukan: ${resolveLookupUserLabel(rows[0] as AdminUser)}.`);
          return;
        }

        setTemplateLookupHint(rows.length > 1 ? "Pilih user dari daftar hasil." : "User tidak ditemukan.");
      } catch (error) {
        if (currentRun !== templateLookupRunRef.current) return;
        setTemplateLookupRows([]);
        setTemplateLookupHint(error instanceof Error ? error.message : "Gagal fetch user.");
      } finally {
        if (currentRun === templateLookupRunRef.current) {
          setTemplateLookupLoading(false);
        }
      }
    }, 320);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [accessToken, activeCreateModal, lookupRecipientUsers, templateUserId]);

  function selectPushLookupUser(user: AdminUser) {
    setPushSelectedUser(user);
    setPushUserId(user.username || user.email || user.id);
    setPushLookupRows([]);
    setPushLookupHint(`User dipilih: ${resolveLookupUserLabel(user)} (${user.id})`);
  }

  function selectTemplateLookupUser(user: AdminUser) {
    setTemplateSelectedUser(user);
    setTemplateUserId(user.username || user.email || user.id);
    setTemplateLookupRows([]);
    setTemplateLookupHint(`User dipilih: ${resolveLookupUserLabel(user)} (${user.id})`);
  }

  async function onCreateTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!code.trim() || !titleTemplate.trim() || !bodyTemplate.trim()) {
      setPageError("Kode, judul template, dan isi template wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createNotificationTemplateAdmin(accessToken, {
        code: code.trim(),
        title_template: titleTemplate.trim(),
        body_template: bodyTemplate.trim(),
        channel,
        is_active: true,
      });
      setCode("");
      setTitleTemplate("");
      setBodyTemplate("");
      setChannel("in_app");
      closeCreateModal();
      setPageMessage("Template berhasil dibuat.");
      await loadTemplates();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal membuat template.");
    }
  }

  function onPrepareTemplateEdit(item: Record<string, unknown>) {
    setTemplateEditCode(String(item.code ?? ""));
    setTemplateEditTitle(String(item.title_template ?? ""));
    setTemplateEditBody(String(item.body_template ?? ""));
    setTemplateEditChannel(parseChannel(item.channel));
    setTemplateEditActive(asBoolean(item.is_active, true));
    setTemplateEditModalOpen(true);
  }

  async function onUpdateTemplate() {
    if (!accessToken || !templateEditCode.trim()) return;
    if (!templateEditTitle.trim() || !templateEditBody.trim()) {
      setPageError("Judul template dan isi template wajib diisi.");
      return;
    }

    clearFeedback();
    setTemplateEditModalSaving(true);
    try {
      await updateNotificationTemplateAdmin(accessToken, templateEditCode.trim(), {
        title_template: templateEditTitle.trim(),
        body_template: templateEditBody.trim(),
        channel: templateEditChannel,
        is_active: templateEditActive,
      });
      setPageMessage(`Template ${templateEditCode.trim()} berhasil diperbarui.`);
      setTemplateEditModalOpen(false);
      await loadTemplates();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal memperbarui template.");
    } finally {
      setTemplateEditModalSaving(false);
    }
  }

  async function onDisableTemplate(itemCode: string) {
    if (!accessToken || !itemCode.trim()) return;

    clearFeedback();
    try {
      await disableNotificationTemplateAdmin(accessToken, itemCode);
      setPageMessage(`Template ${itemCode} berhasil dinonaktifkan.`);
      await loadTemplates();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal menonaktifkan template.");
    }
  }

  async function onPushManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if ((!pushUserId.trim() && !pushSelectedUser) || !pushTitle.trim() || !pushBody.trim()) {
      setPageError("User (ID/username/email/nomor HP), judul, dan isi pesan wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      const recipient = pushSelectedUser
        ? { user_ids: [pushSelectedUser.id] }
        : parseRecipientInput(pushUserId);
      const result = await sendToUsers(accessToken, {
        ...recipient,
        title: pushTitle.trim(),
        body: pushBody.trim(),
        channel: pushChannel,
      });
      const total = Number(result.total_recipients ?? result.created_count ?? result.total ?? 0);
      const success = Number(result.successful_sends ?? result.succeeded ?? result.push_sent ?? 0);
      setPushUserId("");
      setPushTitle("");
      setPushBody("");
      setPushChannel("in_app");
      setPushSelectedUser(null);
      setPushLookupRows([]);
      setPushLookupHint("");
      closeCreateModal();
      setPageMessage(`Notifikasi personal dibuat. Berhasil ${success}, total target ${total}.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal mengirim notifikasi personal.");
    }
  }

  async function onPushFromTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if ((!templateUserId.trim() && !templateSelectedUser) || !templateCode.trim()) {
      setPageError("User (ID/username/email/nomor HP) dan kode template wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      const recipient = templateSelectedUser
        ? { user_id: templateSelectedUser.id }
        : parseTemplateRecipientInput(templateUserId);
      await pushNotificationFromTemplateAdmin(accessToken, {
        ...recipient,
        template_code: templateCode.trim(),
        channel: templateChannel,
        variables: {},
      });
      setTemplateUserId("");
      setTemplateCode("");
      setTemplateChannel("in_app");
      setTemplateSelectedUser(null);
      setTemplateLookupRows([]);
      setTemplateLookupHint("");
      closeCreateModal();
      setPageMessage("Notifikasi personal dari template berhasil dibuat.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal mengirim dari template.");
    }
  }

  async function onPushBroadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      setPageError("Judul dan isi broadcast wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      const response = await pushNotificationBroadcastAdmin(accessToken, {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        type: "system",
        channel: broadcastChannel,
        audience_scope: broadcastAudienceScope,
        recipient_limit: asNumber(broadcastRecipientLimit, 10000),
        dispatch_now: broadcastDispatchNow,
        exclude_user_ids: [],
      });
      const created = Number(response.created_count ?? 0);
      const eligible = Number(response.eligible_count ?? created);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastChannel("in_app");
      setBroadcastAudienceScope("active_users");
      setBroadcastRecipientLimit("10000");
      setBroadcastDispatchNow(false);
      closeCreateModal();
      setPageMessage(`Broadcast dibuat: ${created}/${eligible} penerima.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal membuat broadcast.");
    }
  }

  async function onPushTemplateBroadcast(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!broadcastTemplateCode.trim()) {
      setPageError("Kode template broadcast wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      const response = await pushNotificationFromTemplateBroadcastAdmin(accessToken, {
        template_code: broadcastTemplateCode.trim(),
        channel: broadcastTemplateChannel,
        audience_scope: broadcastTemplateAudienceScope,
        recipient_limit: asNumber(broadcastTemplateRecipientLimit, 10000),
        dispatch_now: broadcastTemplateDispatchNow,
        variables: {},
        exclude_user_ids: [],
      });
      const created = Number(response.created_count ?? 0);
      const eligible = Number(response.eligible_count ?? created);
      setBroadcastTemplateCode("");
      setBroadcastTemplateChannel("in_app");
      setBroadcastTemplateAudienceScope("active_users");
      setBroadcastTemplateRecipientLimit("10000");
      setBroadcastTemplateDispatchNow(false);
      closeCreateModal();
      setPageMessage(`Broadcast template dibuat: ${created}/${eligible} penerima.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal membuat broadcast template.");
    }
  }

  async function onDispatchQueue(dryRun: boolean) {
    if (!accessToken) return;

    clearFeedback();
    try {
      const result = await dispatchPushQueueAdmin(accessToken, {
        limit: asNumber(dispatchLimit, 100),
        max_attempts: asNumber(dispatchMaxAttempts, 5),
        dry_run: dryRun,
      });
      setPageMessage(`Dispatch push ${dryRun ? "simulasi" : "eksekusi"}: ${JSON.stringify(result)}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Gagal menjalankan dispatch push queue.");
    }
  }

  function renderCreateModalForm() {
    if (!activeCreateModal) return null;

    if (activeCreateModal === "create_template") {
      return (
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onCreateTemplate}>
          <Input label="Kode" value={code} onChange={(e) => setCode(e.target.value)} required />
          <Select
            label="Kanal"
            value={channel}
            hint={CHANNEL_HINT_MAP[channel]}
            onChange={(e) => setChannel(parseChannel(e.target.value))}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Judul Template"
            className="md:col-span-2"
            value={titleTemplate}
            onChange={(e) => setTitleTemplate(e.target.value)}
            required
          />
          <Textarea
            label="Isi Template"
            className="md:col-span-2"
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>Tutup</Button>
            <Button type="submit">Simpan Template</Button>
          </div>
        </form>
      );
    }

    if (activeCreateModal === "push_manual") {
      return (
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onPushManual}>
          <div className="space-y-2 md:col-span-2">
            <Input
              label="User (ID / Username / Email / Nomor HP)"
              placeholder="contoh: 7ed... / johndoe / user@mail.com"
              value={pushUserId}
              onChange={(e) => {
                setPushUserId(e.target.value);
                setPushSelectedUser(null);
              }}
              hint="Ketik username/email/nomor HP, sistem akan cari user otomatis."
              required
            />
            {pushLookupLoading ? <p className="text-xs text-slate-500">Mencari user...</p> : null}
            {pushLookupHint ? <p className="text-xs text-slate-600">{pushLookupHint}</p> : null}
            {pushSelectedUser ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                Target: {resolveLookupUserLabel(pushSelectedUser)} ({pushSelectedUser.id})
              </div>
            ) : null}
            {!pushSelectedUser && pushLookupRows.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white">
                {pushLookupRows.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="block w-full border-b border-[var(--color-border)] px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                    onClick={() => selectPushLookupUser(user)}
                  >
                    <p className="text-sm font-medium text-slate-900">{resolveLookupUserLabel(user)}</p>
                    <p className="text-xs text-slate-500">{resolveLookupUserMeta(user)}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Input label="Judul" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} required />
          <Select
            label="Kanal"
            value={pushChannel}
            hint={CHANNEL_HINT_MAP[pushChannel]}
            onChange={(e) => setPushChannel(parseChannel(e.target.value))}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Textarea
            label="Isi Pesan"
            className="md:col-span-2"
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>Tutup</Button>
            <Button type="submit">Kirim</Button>
          </div>
        </form>
      );
    }

    if (activeCreateModal === "push_template") {
      return (
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onPushFromTemplate}>
          <div className="space-y-2 md:col-span-2">
            <Input
              label="User (ID / Username / Email / Nomor HP)"
              placeholder="contoh: johndoe / user@mail.com"
              value={templateUserId}
              onChange={(e) => {
                setTemplateUserId(e.target.value);
                setTemplateSelectedUser(null);
              }}
              hint="Gunakan identifier user, lalu pilih hasil yang cocok."
              required
            />
            {templateLookupLoading ? <p className="text-xs text-slate-500">Mencari user...</p> : null}
            {templateLookupHint ? <p className="text-xs text-slate-600">{templateLookupHint}</p> : null}
            {templateSelectedUser ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-emerald-800">
                Target: {resolveLookupUserLabel(templateSelectedUser)} ({templateSelectedUser.id})
              </div>
            ) : null}
            {!templateSelectedUser && templateLookupRows.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white">
                {templateLookupRows.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="block w-full border-b border-[var(--color-border)] px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                    onClick={() => selectTemplateLookupUser(user)}
                  >
                    <p className="text-sm font-medium text-slate-900">{resolveLookupUserLabel(user)}</p>
                    <p className="text-xs text-slate-500">{resolveLookupUserMeta(user)}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Input label="Kode Template" value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} required />
          <Select
            label="Kanal"
            value={templateChannel}
            hint={CHANNEL_HINT_MAP[templateChannel]}
            onChange={(e) => setTemplateChannel(parseChannel(e.target.value))}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>Tutup</Button>
            <Button type="submit">Kirim dari Template</Button>
          </div>
        </form>
      );
    }

    if (activeCreateModal === "broadcast_manual") {
      return (
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onPushBroadcast}>
          <Input label="Judul" className="md:col-span-2" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} required />
          <Select
            label="Kanal"
            value={broadcastChannel}
            hint={CHANNEL_HINT_MAP[broadcastChannel]}
            onChange={(e) => setBroadcastChannel(parseChannel(e.target.value))}
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Audiens" value={broadcastAudienceScope} onChange={(e) => setBroadcastAudienceScope(parseAudienceScope(e.target.value))}>
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Input
            label="Batas Penerima"
            hint="Jumlah maksimum user yang akan diproses pada 1 broadcast."
            type="number"
            min="1"
            value={broadcastRecipientLimit}
            onChange={(e) => setBroadcastRecipientLimit(e.target.value)}
          />
            <label className="flex items-center gap-2 pt-8 text-sm text-slate-700">
              <input type="checkbox" checked={broadcastDispatchNow} onChange={(e) => setBroadcastDispatchNow(e.target.checked)} />
            Kirim sekarang (khusus channel Push)
            </label>
          <Textarea label="Isi Pesan" className="md:col-span-2" value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} required />
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>Tutup</Button>
            <Button type="submit">Kirim Broadcast</Button>
          </div>
        </form>
      );
    }

    return (
      <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onPushTemplateBroadcast}>
        <Input label="Kode Template" value={broadcastTemplateCode} onChange={(e) => setBroadcastTemplateCode(e.target.value)} required />
        <Select
          label="Kanal"
          value={broadcastTemplateChannel}
          hint={CHANNEL_HINT_MAP[broadcastTemplateChannel]}
          onChange={(e) => setBroadcastTemplateChannel(parseChannel(e.target.value))}
        >
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select label="Audiens" value={broadcastTemplateAudienceScope} onChange={(e) => setBroadcastTemplateAudienceScope(parseAudienceScope(e.target.value))}>
          {AUDIENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Batas Penerima"
          hint="Jumlah maksimum user yang akan diproses pada 1 broadcast template."
          type="number"
          min="1"
          value={broadcastTemplateRecipientLimit}
          onChange={(e) => setBroadcastTemplateRecipientLimit(e.target.value)}
        />
        <label className="flex items-center gap-2 pt-8 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" checked={broadcastTemplateDispatchNow} onChange={(e) => setBroadcastTemplateDispatchNow(e.target.checked)} />
          Kirim sekarang (khusus channel Push)
        </label>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="ghost" onClick={closeCreateModal}>Tutup</Button>
          <Button type="submit">Kirim Broadcast dari Template</Button>
        </div>
      </form>
    );
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<Bell size={28} />} title="Khusus Admin" description="Halaman notifikasi hanya untuk admin/superadmin." />;
  }

  const activeModalMeta = activeCreateModal ? CREATE_MODAL_META[activeCreateModal] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifikasi & Broadcast Admin</CardTitle>
          <CardDescription>Satu halaman untuk semua kebutuhan notifikasi admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadTemplates()} isLoading={loading}>
              Muat Ulang
            </Button>
          </div>
          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Panduan Cepat</CardTitle>
          <CardDescription>Urutan aman untuk admin pemula.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Buat template dulu jika ingin kirim pesan berulang.</li>
            <li>Pilih aksi dari tombol, semua form pembuatan dibuka via modal.</li>
            <li>Untuk kirim personal, bisa pakai ID, username, email, atau nomor HP.</li>
            <li>`Inbox Aplikasi (In-App)` = masuk inbox notifikasi aplikasi (tanpa email/popup perangkat).</li>
            <li>`Email` = kirim ke email user terdaftar.</li>
            <li>`Push ke Perangkat` = notifikasi popup ke perangkat user (perlu token FCM aktif).</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aksi Buat</CardTitle>
          <CardDescription>Pilih aksi yang ingin dibuat.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Button type="button" leftIcon={<Plus size={14} />} onClick={() => setActiveCreateModal("create_template")}>Buat Template</Button>
          <Button type="button" variant="secondary" onClick={() => setActiveCreateModal("push_manual")}>Kirim Personal</Button>
          <Button type="button" variant="secondary" onClick={() => setActiveCreateModal("push_template")}>Kirim Personal dari Template</Button>
          <Button type="button" variant="outline" onClick={() => setActiveCreateModal("broadcast_manual")}>Kirim Broadcast</Button>
          <Button type="button" variant="outline" onClick={() => setActiveCreateModal("broadcast_template")}>Kirim Broadcast dari Template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Template</CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length === 0 && !loading ? (
            <EmptyState title="Belum Ada Template" description="Silakan buat template notifikasi pertama." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Kode</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead>Aksi</TableHead>
                </tr>
              </thead>
              <tbody>
                {templates.map((item, index) => (
                  <TableRow key={`template-${index}`}>
                    <TableCell>{String(item.code ?? "-")}</TableCell>
                    <TableCell>{String(item.title_template ?? "-")}</TableCell>
                    <TableCell>{resolveChannelLabel(item.channel)}</TableCell>
                    <TableCell>
                      <Badge variant={Boolean(item.is_active) ? "success" : "danger"}>
                        {String(item.is_active ? "aktif" : "nonaktif")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((item.updated_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => onPrepareTemplateEdit(item)}>Ubah</Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void onDisableTemplate(String(item.code ?? ""))}>Nonaktifkan</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Push Queue (Opsional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input label="Batas Kirim" type="number" min="1" value={dispatchLimit} onChange={(e) => setDispatchLimit(e.target.value)} />
          <Input label="Percobaan Maks" type="number" min="1" value={dispatchMaxAttempts} onChange={(e) => setDispatchMaxAttempts(e.target.value)} />
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => void onDispatchQueue(true)}>Simulasi</Button>
            <Button type="button" variant="secondary" onClick={() => void onDispatchQueue(false)}>Jalankan Dispatch</Button>
          </div>
        </CardContent>
      </Card>

      {activeModalMeta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true">
            <CardHeader>
              <CardTitle>{activeModalMeta.title}</CardTitle>
              <CardDescription>{activeModalMeta.description}</CardDescription>
            </CardHeader>
            <CardContent>{renderCreateModalForm()}</CardContent>
          </Card>
        </div>
      ) : null}

      {templateEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !templateEditModalSaving) {
              setTemplateEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true">
            <CardHeader>
              <CardTitle>Ubah Template Notifikasi</CardTitle>
              <CardDescription>Kode: {templateEditCode}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Judul Template" value={templateEditTitle} onChange={(e) => setTemplateEditTitle(e.target.value)} required />
              <Select
                label="Kanal"
                value={templateEditChannel}
                hint={CHANNEL_HINT_MAP[templateEditChannel]}
                onChange={(e) => setTemplateEditChannel(parseChannel(e.target.value))}
              >
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Isi Template"
                className="md:col-span-2"
                value={templateEditBody}
                onChange={(e) => setTemplateEditBody(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input type="checkbox" checked={templateEditActive} onChange={(e) => setTemplateEditActive(e.target.checked)} />
                Aktif
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setTemplateEditModalOpen(false)} disabled={templateEditModalSaving}>Tutup</Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdateTemplate()} isLoading={templateEditModalSaving}>Simpan Perubahan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
