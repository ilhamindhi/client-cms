"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, RefreshCw, Search } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { listMembershipPlansAdmin } from "@/lib/api/membership";
import { createGiftCode, getGiftCodeByIdAdmin, listGiftCodesAdmin, updateGiftCode } from "@/lib/api/points";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { GiftCode as GiftCodeModel, MembershipPlan } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type GiftCodeForm = {
  code: string;
  title: string;
  description: string;
  reward_type: "points_random" | "membership";
  points_pool_total: string;
  random_min_points: string;
  random_max_points: string;
  max_points_per_user: string;
  max_claim_per_user: string;
  max_redemptions: string;
  membership_plan_id: string;
  membership_duration_days: string;
  start_at: string;
  end_at: string;
};

const initialGiftCodeForm: GiftCodeForm = {
  code: "",
  title: "",
  description: "",
  reward_type: "points_random",
  points_pool_total: "1000",
  random_min_points: "10",
  random_max_points: "100",
  max_points_per_user: "100",
  max_claim_per_user: "1",
  max_redemptions: "",
  membership_plan_id: "",
  membership_duration_days: "30",
  start_at: "",
  end_at: "",
};

const selectClassName =
  "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Format tanggal tidak valid.");
  }
  return date.toISOString();
}

export default function GiftCodesPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [giftCodes, setGiftCodes] = useState<GiftCodeModel[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<GiftCodeForm>(initialGiftCodeForm);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [editGiftCodeId, setEditGiftCodeId] = useState("");
  const [editForm, setEditForm] = useState<GiftCodeForm>(initialGiftCodeForm);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Gift Codes",
    successTitle: "Gift Codes",
  });

  const filteredGiftCodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return giftCodes;
    }
    return giftCodes.filter((entry) => {
      return (
        entry.code.toLowerCase().includes(q) ||
        entry.title.toLowerCase().includes(q) ||
        entry.reward_type.toLowerCase().includes(q)
      );
    });
  }, [giftCodes, query]);

  async function loadData() {
    if (!accessToken || !hasAdminAccess) {
      return;
    }

    setLoading(true);
    setPageError(null);
    try {
      const [giftCodeRows, planRows] = await Promise.all([
        listGiftCodesAdmin(accessToken, { limit: 200, offset: 0 }),
        listMembershipPlansAdmin(accessToken, 200),
      ]);
      setGiftCodes(giftCodeRows);
      setPlans(planRows.filter((entry) => entry.is_active));
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to load gift code data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateGiftCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setSaving(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await createGiftCode(accessToken, {
        code: form.code.trim(),
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        reward_type: form.reward_type,
        points_pool_total:
          form.reward_type === "points_random" ? asNumber(form.points_pool_total) : undefined,
        random_min_points: Math.max(1, asNumber(form.random_min_points)),
        random_max_points: optionalNumber(form.random_max_points),
        max_points_per_user: optionalNumber(form.max_points_per_user),
        max_claim_per_user: Math.max(1, asNumber(form.max_claim_per_user)),
        max_redemptions: optionalNumber(form.max_redemptions),
        membership_plan_id:
          form.reward_type === "membership" ? form.membership_plan_id || undefined : undefined,
        membership_duration_days: Math.max(1, asNumber(form.membership_duration_days)),
        start_at: toIsoDateTime(form.start_at),
        end_at: toIsoDateTime(form.end_at),
        is_active: true,
      });
      setForm(initialGiftCodeForm);
      setPageMessage("Gift code campaign berhasil dibuat.");
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to create gift code");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleGiftCodeActive(entry: GiftCodeModel) {
    if (!accessToken) {
      return;
    }

    setRowActionId(entry.id);
    setPageError(null);
    setPageMessage(null);
    try {
      await updateGiftCode(accessToken, entry.id, { is_active: !entry.is_active });
      setPageMessage(`Gift code ${entry.code} ${entry.is_active ? "dinonaktifkan" : "diaktifkan"}.`);
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update gift code");
    } finally {
      setRowActionId(null);
    }
  }

  async function onPrepareGiftCodeEdit(giftCodeId: string) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    setEditGiftCodeId(giftCodeId);
    setEditModalLoading(true);
    try {
      const detail = await getGiftCodeByIdAdmin(accessToken, giftCodeId);
      setEditGiftCodeId(detail.id);
      setEditForm({
        code: detail.code ?? "",
        title: detail.title ?? "",
        description: detail.description ?? "",
        reward_type: detail.reward_type ?? "points_random",
        points_pool_total: detail.points_pool_total != null ? String(asNumber(detail.points_pool_total)) : "",
        random_min_points: String(asNumber(detail.random_min_points)),
        random_max_points: detail.random_max_points != null ? String(asNumber(detail.random_max_points)) : "",
        max_points_per_user: detail.max_points_per_user != null ? String(asNumber(detail.max_points_per_user)) : "",
        max_claim_per_user: String(asNumber(detail.max_claim_per_user)),
        max_redemptions: detail.max_redemptions != null ? String(asNumber(detail.max_redemptions)) : "",
        membership_plan_id: detail.membership_plan_id ?? "",
        membership_duration_days: detail.membership_duration_days != null ? String(asNumber(detail.membership_duration_days)) : "30",
        start_at: toDateTimeLocalValue(detail.start_at),
        end_at: toDateTimeLocalValue(detail.end_at),
      });
      setEditModalOpen(true);
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to load gift code detail");
    } finally {
      setEditModalLoading(false);
    }
  }

  async function onSaveGiftCodeEdit() {
    if (!accessToken || !editGiftCodeId.trim()) {
      return;
    }
    if (!editForm.title.trim()) {
      setPageError("Title wajib diisi.");
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setEditModalSaving(true);
    try {
      await updateGiftCode(accessToken, editGiftCodeId.trim(), {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        reward_type: editForm.reward_type,
        points_pool_total:
          editForm.reward_type === "points_random" ? asNumber(editForm.points_pool_total) : undefined,
        random_min_points: Math.max(1, asNumber(editForm.random_min_points)),
        random_max_points: optionalNumber(editForm.random_max_points),
        max_points_per_user: optionalNumber(editForm.max_points_per_user),
        max_claim_per_user: Math.max(1, asNumber(editForm.max_claim_per_user)),
        max_redemptions: optionalNumber(editForm.max_redemptions),
        membership_plan_id:
          editForm.reward_type === "membership" ? editForm.membership_plan_id || undefined : undefined,
        membership_duration_days: Math.max(1, asNumber(editForm.membership_duration_days)),
        start_at: toIsoDateTime(editForm.start_at),
        end_at: toIsoDateTime(editForm.end_at),
      });
      setEditModalOpen(false);
      setPageMessage(`Gift code ${editGiftCodeId.trim()} updated.`);
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update gift code");
    } finally {
      setEditModalSaving(false);
    }
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={<Gift size={28} />}
        title="Admin only"
        description="Halaman gift code hanya untuk role admin atau superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gift Codes</CardTitle>
          <CardDescription>
            Manajemen campaign gift code untuk random points reward atau hadiah membership.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
                placeholder="Search code/title/reward type..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={loadData}
              isLoading={loading}
              leftIcon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
          </div>

          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Gift Code Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={onCreateGiftCodeSubmit}>
            <Input
              label="Code"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="HADIAH-2026"
              required
            />
            <Input
              label="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Campaign Tahun Baru"
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Reward Type</span>
              <select
                className={selectClassName}
                value={form.reward_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    reward_type: event.target.value as GiftCodeForm["reward_type"],
                  }))
                }
              >
                <option value="points_random">points_random</option>
                <option value="membership">membership</option>
              </select>
            </label>
            <Input
              label="Description (Optional)"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Promo khusus komunitas"
            />

            {form.reward_type === "points_random" ? (
              <>
                <Input
                  label="Points Pool Total"
                  type="number"
                  min="1"
                  value={form.points_pool_total}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, points_pool_total: event.target.value }))
                  }
                  required
                />
                <Input
                  label="Random Min Points"
                  type="number"
                  min="1"
                  value={form.random_min_points}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, random_min_points: event.target.value }))
                  }
                  required
                />
                <Input
                  label="Random Max Points"
                  type="number"
                  min="1"
                  value={form.random_max_points}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, random_max_points: event.target.value }))
                  }
                />
                <Input
                  label="Max Points Per User (Optional)"
                  type="number"
                  min="1"
                  value={form.max_points_per_user}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, max_points_per_user: event.target.value }))
                  }
                />
              </>
            ) : (
              <>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Membership Plan</span>
                  <select
                    className={selectClassName}
                    value={form.membership_plan_id}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        membership_plan_id: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select plan...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Membership Duration Days"
                  type="number"
                  min="1"
                  value={form.membership_duration_days}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      membership_duration_days: event.target.value,
                    }))
                  }
                />
              </>
            )}

            <Input
              label="Max Claim Per User"
              type="number"
              min="1"
              value={form.max_claim_per_user}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, max_claim_per_user: event.target.value }))
              }
            />
            <Input
              label="Max Redemptions (Optional)"
              type="number"
              min="1"
              value={form.max_redemptions}
              onChange={(event) => setForm((prev) => ({ ...prev, max_redemptions: event.target.value }))}
            />
            <Input
              label="Start At (Optional)"
              type="datetime-local"
              value={form.start_at}
              onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))}
            />
            <Input
              label="End At (Optional)"
              type="datetime-local"
              value={form.end_at}
              onChange={(event) => setForm((prev) => ({ ...prev, end_at: event.target.value }))}
            />

            <div className="lg:col-span-3">
              <Button type="submit" isLoading={saving}>
                Save Gift Code
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gift Code Campaign List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && giftCodes.length === 0 ? (
            <Table aria-label="Loading gift code list">
              <thead>
                <tr>
                  <TableHead>Code</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`gift-code-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : filteredGiftCodes.length === 0 ? (
            <EmptyState title="Belum ada gift code" description="Buat campaign gift code pertama." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Code</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Quota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {filteredGiftCodes.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{entry.code}</div>
                      <div className="text-xs text-slate-500">{entry.title}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.reward_type === "membership" ? "warning" : "info"}>
                        {entry.reward_type}
                      </Badge>
                      <div className="mt-1 text-xs text-slate-500">
                        {entry.reward_type === "membership"
                          ? `Plan: ${entry.membership_plan_name || "-"}`
                          : `Random: ${asNumber(entry.random_min_points)}-${asNumber(entry.random_max_points ?? entry.random_min_points)}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.reward_type === "membership" ? (
                        <span>{asNumber(entry.redeemed_count)} redeemed</span>
                      ) : (
                        <div>
                          <div>{asNumber(entry.points_pool_remaining)} left</div>
                          <div className="text-xs text-slate-500">
                            total: {asNumber(entry.points_pool_total)}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.is_active ? "success" : "danger"}>
                        {entry.is_active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          isLoading={editModalLoading && editGiftCodeId === entry.id}
                          onClick={() => {
                            void onPrepareGiftCodeEdit(entry.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={entry.is_active ? "outline" : "secondary"}
                          isLoading={rowActionId === entry.id}
                          onClick={() => {
                            void onToggleGiftCodeActive(entry);
                          }}
                        >
                          {entry.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editModalSaving) {
              setEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="gift-code-edit-modal-title">
            <CardHeader>
              <CardTitle id="gift-code-edit-modal-title">Edit Gift Code Campaign</CardTitle>
              <CardDescription>ID: {editGiftCodeId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Code"
                value={editForm.code}
                onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value }))}
                disabled
              />
              <Input
                label="Title"
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Reward Type</span>
                <select
                  className={selectClassName}
                  value={editForm.reward_type}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      reward_type: event.target.value as GiftCodeForm["reward_type"],
                    }))
                  }
                >
                  <option value="points_random">points_random</option>
                  <option value="membership">membership</option>
                </select>
              </label>
              <Input
                label="Description (Optional)"
                value={editForm.description}
                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
              />

              {editForm.reward_type === "points_random" ? (
                <>
                  <Input
                    label="Points Pool Total"
                    type="number"
                    min="1"
                    value={editForm.points_pool_total}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, points_pool_total: event.target.value }))}
                    required
                  />
                  <Input
                    label="Random Min Points"
                    type="number"
                    min="1"
                    value={editForm.random_min_points}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, random_min_points: event.target.value }))}
                    required
                  />
                  <Input
                    label="Random Max Points"
                    type="number"
                    min="1"
                    value={editForm.random_max_points}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, random_max_points: event.target.value }))}
                  />
                  <Input
                    label="Max Points Per User (Optional)"
                    type="number"
                    min="1"
                    value={editForm.max_points_per_user}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, max_points_per_user: event.target.value }))}
                  />
                </>
              ) : (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">Membership Plan</span>
                    <select
                      className={selectClassName}
                      value={editForm.membership_plan_id}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, membership_plan_id: event.target.value }))}
                      required
                    >
                      <option value="">Select plan...</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Membership Duration Days"
                    type="number"
                    min="1"
                    value={editForm.membership_duration_days}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, membership_duration_days: event.target.value }))}
                  />
                </>
              )}

              <Input
                label="Max Claim Per User"
                type="number"
                min="1"
                value={editForm.max_claim_per_user}
                onChange={(event) => setEditForm((prev) => ({ ...prev, max_claim_per_user: event.target.value }))}
              />
              <Input
                label="Max Redemptions (Optional)"
                type="number"
                min="1"
                value={editForm.max_redemptions}
                onChange={(event) => setEditForm((prev) => ({ ...prev, max_redemptions: event.target.value }))}
              />
              <Input
                label="Start At (Optional)"
                type="datetime-local"
                value={editForm.start_at}
                onChange={(event) => setEditForm((prev) => ({ ...prev, start_at: event.target.value }))}
              />
              <Input
                label="End At (Optional)"
                type="datetime-local"
                value={editForm.end_at}
                onChange={(event) => setEditForm((prev) => ({ ...prev, end_at: event.target.value }))}
              />

              <div className="flex justify-end gap-2 md:col-span-3">
                <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)} disabled={editModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onSaveGiftCodeEdit()} isLoading={editModalSaving || editModalLoading}>
                  Save Gift Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
