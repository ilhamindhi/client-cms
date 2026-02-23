"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpen, RefreshCw, UploadCloud } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Select from "@/components/ui/Select";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import {
  archiveContentAdmin,
  createContentAdmin,
  getContentAdminById,
  listContentAdmin,
  type ContentAdminResource,
  updateContentAdmin,
  upsertNationalMetricAdmin,
} from "@/lib/api/content";
import {
  confirmMediaUpload,
  createMediaSignUpload,
  type MediaResourceType,
} from "@/lib/api/media";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

type UploadTarget = "create" | "update";
type MediaField = "image_url" | "video_url" | "audio_url";

type CloudinaryUploadResponse = {
  asset_id?: unknown;
  public_id?: unknown;
  resource_type?: unknown;
  type?: unknown;
  version?: unknown;
  format?: unknown;
  bytes?: unknown;
  width?: unknown;
  height?: unknown;
  duration?: unknown;
  secure_url?: unknown;
  url?: unknown;
  thumbnail_url?: unknown;
  original_filename?: unknown;
  folder?: unknown;
  tags?: unknown;
  error?: unknown;
};

type UploadedMediaResult = {
  secureUrl: string;
  resourceType: MediaResourceType;
  originalFilename: string;
};

type ArticleEditForm = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  content: string;
  is_featured: boolean;
  is_active: boolean;
};

const RESOURCE_OPTIONS: ContentAdminResource[] = [
  "article-categories",
  "articles",
  "events",
  "workouts",
  "meditations",
  "recipes",
];

const MEDIA_FIELDS_BY_RESOURCE: Record<ContentAdminResource, MediaField[]> = {
  "article-categories": [],
  articles: ["image_url"],
  events: ["image_url"],
  workouts: ["image_url", "video_url"],
  meditations: ["image_url", "audio_url"],
  recipes: ["image_url"],
};

const MEDIA_RESOURCE_BY_FIELD: Record<MediaField, MediaResourceType> = {
  image_url: "image",
  video_url: "video",
  audio_url: "raw",
};

const DEFAULT_PAYLOAD: Record<ContentAdminResource, string> = {
  "article-categories": JSON.stringify({ name: "News", slug: "news", is_active: true }, null, 2),
  articles: JSON.stringify(
    {
      title: "Judul Artikel",
      excerpt: "Ringkasan singkat artikel.",
      content: "<p>Isi artikel</p>",
      is_featured: false,
      is_active: true,
    },
    null,
    2,
  ),
  events: JSON.stringify(
    { title: "Event Komunitas", start_at: new Date().toISOString(), registration_fee: 0, is_active: true },
    null,
    2,
  ),
  workouts: JSON.stringify({ title: "Beginner Workout", level: "beginner", is_active: true }, null, 2),
  meditations: JSON.stringify({ title: "Morning Meditation", level: "beginner", is_active: true }, null, 2),
  recipes: JSON.stringify({ title: "Healthy Recipe", ingredients: [], steps: [], is_active: true }, null, 2),
};

function parseJsonObject(input: string, fieldLabel: string): Record<string, unknown> {
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} harus berupa JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : undefined;
}

function shortenId(value: string) {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function uploadAccept(resourceType: MediaResourceType) {
  if (resourceType === "image") return "image/*";
  if (resourceType === "video") return "video/*";
  return "*/*";
}

function detectResourceTypeFromFile(file: File): MediaResourceType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "raw";
}

function escapeHtmlText(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendHtml(baseHtml: string, snippet: string) {
  const trimmed = baseHtml.trim();
  if (!trimmed || trimmed === "<p></p>") {
    return snippet;
  }
  return `${trimmed}${snippet}`;
}

function toEditableResourcePayload(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.id;
  delete next.created_at;
  delete next.updated_at;
  delete next.deleted_at;
  return next;
}

export default function ContentPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [resource, setResource] = useState<ContentAdminResource>("articles");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [createJson, setCreateJson] = useState(DEFAULT_PAYLOAD.articles);
  const [showAdvancedSection, setShowAdvancedSection] = useState(false);

  const [metricCode, setMetricCode] = useState("national_distance_km");
  const [metricDate, setMetricDate] = useState(new Date().toISOString().slice(0, 10));
  const [metricValue, setMetricValue] = useState("0");

  const [articleDraftTitle, setArticleDraftTitle] = useState("Judul Artikel");
  const [articleDraftSlug, setArticleDraftSlug] = useState("");
  const [articleDraftExcerpt, setArticleDraftExcerpt] = useState("");
  const [articleDraftImageUrl, setArticleDraftImageUrl] = useState("");
  const [articleDraftContentHtml, setArticleDraftContentHtml] = useState("<p>Isi artikel</p>");
  const [articleDraftFeatured, setArticleDraftFeatured] = useState(false);
  const [articleDraftActive, setArticleDraftActive] = useState(true);

  const [uploadTarget, setUploadTarget] = useState<UploadTarget>("create");
  const [uploadField, setUploadField] = useState<MediaField>("image_url");
  const [uploadResourceType, setUploadResourceType] = useState<MediaResourceType>("image");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [manualMediaUrl, setManualMediaUrl] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [articleContentUploadFile, setArticleContentUploadFile] = useState<File | null>(null);
  const [articleContentUploadInputKey, setArticleContentUploadInputKey] = useState(0);
  const [articleContentUploading, setArticleContentUploading] = useState(false);
  const [articleContentPreviewUrl, setArticleContentPreviewUrl] = useState("");
  const [articleContentPreviewType, setArticleContentPreviewType] = useState<MediaResourceType | null>(null);
  const [autoSetCoverFromContentUpload, setAutoSetCoverFromContentUpload] = useState(true);
  const [articleEditModal, setArticleEditModal] = useState<ArticleEditForm | null>(null);
  const [articleEditModalLoading, setArticleEditModalLoading] = useState(false);
  const [articleEditModalSaving, setArticleEditModalSaving] = useState(false);
  const [articleEditModalArchiving, setArticleEditModalArchiving] = useState(false);
  const [resourceEditModal, setResourceEditModal] = useState<{ id: string; payloadJson: string } | null>(null);
  const [resourceEditModalLoadingId, setResourceEditModalLoadingId] = useState<string | null>(null);
  const [resourceEditModalSaving, setResourceEditModalSaving] = useState(false);
  const [resourceEditModalArchiving, setResourceEditModalArchiving] = useState(false);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Content",
    successTitle: "Content",
  });

  const isArticleResource = resource === "articles";
  const mediaFieldOptions = useMemo(() => MEDIA_FIELDS_BY_RESOURCE[resource], [resource]);

  useEffect(() => {
    const nextPayloadText = DEFAULT_PAYLOAD[resource];
    setCreateJson(nextPayloadText);
    setShowAdvancedSection(resource !== "articles");

    const nextMediaField = MEDIA_FIELDS_BY_RESOURCE[resource][0];
    if (nextMediaField) {
      setUploadField(nextMediaField);
      setUploadResourceType(MEDIA_RESOURCE_BY_FIELD[nextMediaField]);
    } else {
      setUploadField("image_url");
      setUploadResourceType("image");
    }
    setUploadFile(null);
    setUploadInputKey((value) => value + 1);
    setManualMediaUrl("");
    setArticleContentUploadFile(null);
    setArticleContentUploadInputKey((value) => value + 1);
    setArticleContentPreviewUrl("");
    setArticleContentPreviewType(null);
    setArticleEditModal(null);
    setResourceEditModal(null);

    if (resource === "articles") {
      try {
        const parsed = parseJsonObject(nextPayloadText, "Default article payload");
        hydrateArticleDraft(parsed);
      } catch {
        hydrateArticleDraft({
          title: "Judul Artikel",
          excerpt: "Ringkasan singkat artikel.",
          image_url: "",
          content: "<p>Isi artikel</p>",
          is_featured: false,
          is_active: true,
        });
      }
    }
  }, [resource]);

  const previewColumns = useMemo(() => {
    const first = rows[0] ?? {};
    return Object.keys(first).slice(0, 8);
  }, [rows]);

  function hydrateArticleDraft(payload: Record<string, unknown>) {
    setArticleDraftTitle(asString(payload.title, "Judul Artikel"));
    setArticleDraftSlug(asString(payload.slug));
    setArticleDraftExcerpt(asString(payload.excerpt, asString(payload.summary)));
    setArticleDraftImageUrl(asString(payload.image_url));
    setArticleDraftContentHtml(asString(payload.content, "<p>Isi artikel</p>"));
    setArticleDraftFeatured(asBoolean(payload.is_featured, false));
    setArticleDraftActive(asBoolean(payload.is_active, true));
  }

  function toArticleEditForm(payload: Record<string, unknown>): ArticleEditForm {
    return {
      id: asString(payload.id),
      title: asString(payload.title, "Untitled"),
      slug: asString(payload.slug),
      excerpt: asString(payload.excerpt, asString(payload.summary)),
      image_url: asString(payload.image_url),
      content: asString(payload.content, "<p></p>"),
      is_featured: asBoolean(payload.is_featured, false),
      is_active: asBoolean(payload.is_active, true),
    };
  }

  function composeArticlePayload() {
    return {
      title: articleDraftTitle.trim() || "Untitled",
      slug: articleDraftSlug.trim() || undefined,
      excerpt: articleDraftExcerpt.trim() || undefined,
      image_url: articleDraftImageUrl.trim() || undefined,
      content: articleDraftContentHtml || "<p></p>",
      is_featured: articleDraftFeatured,
      is_active: articleDraftActive,
    };
  }

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  function applyMediaUrlToPayload(target: UploadTarget, field: MediaField, url: string) {
    const source = target === "create" ? createJson : resourceEditModal?.payloadJson ?? "{}";
    const parsed = parseJsonObject(source, target === "create" ? "Create JSON" : "Update JSON");
    parsed[field] = url;
    const next = JSON.stringify(parsed, null, 2);

    if (target === "create") {
      setCreateJson(next);
    } else {
      if (!resourceEditModal) {
        setPageError("Buka modal edit dulu sebelum apply ke Update JSON.");
        return;
      }
      setResourceEditModal((prev) =>
        prev
          ? {
              ...prev,
              payloadJson: next,
            }
          : prev,
      );
    }

    if (resource === "articles" && field === "image_url") {
      setArticleDraftImageUrl(url);
    }
  }

  function upsertFieldInJsonObject(text: string, field: string, value: string) {
    try {
      const parsed = parseJsonObject(text, "JSON payload");
      parsed[field] = value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  }

  function syncArticleCoverToJsons(url: string) {
    setCreateJson((previous) => upsertFieldInJsonObject(previous, "image_url", url));
  }

  function renderCell(row: Record<string, unknown>, col: string): ReactNode {
    const value = row[col];

    if (col === "id" && typeof value === "string") {
      return <span title={value}>{shortenId(value)}</span>;
    }
    if (col.endsWith("_at")) {
      return formatDateTime(typeof value === "string" ? value : null);
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value);
    }
    return String(value ?? "-");
  }

  async function loadRows() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const data = await listContentAdmin(accessToken, resource, {
        q: query || undefined,
        limit: 50,
        offset: 0,
      });
      setRows(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load content data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess, resource]);

  function onFormatCreateJson() {
    clearFeedback();
    try {
      const parsed = parseJsonObject(createJson, "Create JSON");
      setCreateJson(JSON.stringify(parsed, null, 2));
      setPageMessage("Create JSON valid dan sudah diformat.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Create JSON tidak valid.");
    }
  }

  async function onCreateArticleSimple() {
    if (!accessToken) return;

    clearFeedback();
    try {
      const payload = composeArticlePayload();
      setCreateJson(JSON.stringify(payload, null, 2));
      const created = await createContentAdmin(accessToken, "articles", payload);
      const createdId = asString(created.id);
      setPageMessage(createdId ? `Article created (${createdId}).` : "Article created.");
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create article");
    }
  }

  function onApplyManualMediaUrl(target: UploadTarget) {
    clearFeedback();
    const url = manualMediaUrl.trim();
    if (!url) {
      setPageError("Manual media URL wajib diisi.");
      return;
    }

    try {
      const parsedUrl = new URL(url);
      applyMediaUrlToPayload(target, uploadField, parsedUrl.toString());
      setPageMessage(`URL media diterapkan ke ${target} payload (${uploadField}).`);
    } catch {
      setPageError("Manual media URL tidak valid.");
    }
  }

  async function uploadAndConfirmMediaAsset(input: {
    file: File;
    resourceType: MediaResourceType;
    context: Record<string, string>;
  }): Promise<UploadedMediaResult> {
    if (!accessToken) {
      throw new Error("Akses token tidak tersedia.");
    }

    const signResult = await createMediaSignUpload(accessToken, {
      resource_type: input.resourceType,
      context: input.context,
    });

    const uploadForm = new FormData();
    for (const [key, value] of Object.entries(signResult.upload_params)) {
      uploadForm.append(key, String(value));
    }
    uploadForm.append("file", input.file);

    const uploadResponse = await fetch(signResult.upload_url, {
      method: "POST",
      body: uploadForm,
    });
    const uploadPayload = (await uploadResponse.json()) as CloudinaryUploadResponse;

    if (!uploadResponse.ok) {
      const cloudinaryError =
        typeof uploadPayload.error === "object" &&
        uploadPayload.error &&
        "message" in uploadPayload.error &&
        typeof (uploadPayload.error as { message?: unknown }).message === "string"
          ? (uploadPayload.error as { message: string }).message
          : `Upload gagal (${uploadResponse.status}).`;
      throw new Error(cloudinaryError);
    }

    const assetId = asString(uploadPayload.asset_id);
    const publicId = asString(uploadPayload.public_id);
    const secureUrl = asString(uploadPayload.secure_url);
    const responseType = asString(uploadPayload.resource_type);
    const confirmedResourceType: MediaResourceType =
      responseType === "image" || responseType === "video" || responseType === "raw"
        ? responseType
        : input.resourceType;

    if (!assetId || !publicId || !secureUrl) {
      throw new Error("Response upload Cloudinary tidak lengkap (asset_id/public_id/secure_url).");
    }

    const confirmData = await confirmMediaUpload(accessToken, {
      asset_id: assetId,
      public_id: publicId,
      resource_type: confirmedResourceType,
      type: asString(uploadPayload.type, "upload"),
      version:
        typeof uploadPayload.version === "string" || typeof uploadPayload.version === "number"
          ? uploadPayload.version
          : undefined,
      format: asString(uploadPayload.format) || undefined,
      bytes: asNumber(uploadPayload.bytes),
      width: asNumber(uploadPayload.width),
      height: asNumber(uploadPayload.height),
      duration: asNumber(uploadPayload.duration),
      secure_url: secureUrl,
      url: asString(uploadPayload.url) || undefined,
      thumbnail_url: asString(uploadPayload.thumbnail_url) || undefined,
      original_filename: asString(uploadPayload.original_filename) || undefined,
      folder: asString(uploadPayload.folder) || undefined,
      tags: asStringArray(uploadPayload.tags),
    });

    const finalUrl = asString(confirmData.secure_url, secureUrl);
    return {
      secureUrl: finalUrl,
      resourceType: confirmedResourceType,
      originalFilename: asString(confirmData.original_filename, input.file.name) || input.file.name,
    };
  }

  async function onUploadMedia() {
    if (!accessToken) return;
    if (!uploadFile) {
      setPageError("Pilih file media dulu.");
      return;
    }
    if (mediaFieldOptions.length === 0) {
      setPageError("Resource ini tidak punya field media.");
      return;
    }

    clearFeedback();
    setUploadingMedia(true);

    try {
      const uploaded = await uploadAndConfirmMediaAsset({
        file: uploadFile,
        resourceType: uploadResourceType,
        context: {
          module: "content",
          resource,
          target: uploadTarget,
          field: uploadField,
        },
      });

      applyMediaUrlToPayload(uploadTarget, uploadField, uploaded.secureUrl);
      setManualMediaUrl(uploaded.secureUrl);
      setUploadFile(null);
      setUploadInputKey((value) => value + 1);
      setPageMessage(`Upload sukses. ${uploadField} otomatis terisi ke ${uploadTarget} payload.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Upload media gagal.");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function onUploadArticleContentMedia() {
    if (!accessToken) return;
    if (!articleContentUploadFile) {
      setPageError("Pilih file foto/video untuk artikel.");
      return;
    }

    clearFeedback();
    setArticleContentUploading(true);

    try {
      const detectedType = detectResourceTypeFromFile(articleContentUploadFile);
      const uploaded = await uploadAndConfirmMediaAsset({
        file: articleContentUploadFile,
        resourceType: detectedType,
        context: {
          module: "content",
          resource: "articles",
          target: "editor",
          field: "content",
        },
      });

      const safeUrl = escapeHtmlText(uploaded.secureUrl);
      const safeFilename = escapeHtmlText(uploaded.originalFilename || "media");
      let snippet = `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeFilename}</a></p>`;

      if (uploaded.resourceType === "image") {
        snippet = `<p><img src="${safeUrl}" alt="${safeFilename}" /></p>`;
      } else if (uploaded.resourceType === "video") {
        snippet = `<p><video controls playsinline src="${safeUrl}"></video></p>`;
      }

      setArticleDraftContentHtml((previous) => appendHtml(previous, snippet));
      setArticleContentPreviewUrl(uploaded.secureUrl);
      setArticleContentPreviewType(uploaded.resourceType);
      if (uploaded.resourceType === "image" && autoSetCoverFromContentUpload) {
        setArticleDraftImageUrl(uploaded.secureUrl);
        syncArticleCoverToJsons(uploaded.secureUrl);
      }

      setArticleContentUploadFile(null);
      setArticleContentUploadInputKey((value) => value + 1);
      if (uploaded.resourceType === "image" && autoSetCoverFromContentUpload) {
        setPageMessage("Media artikel berhasil diupload, disisipkan ke content, dan dijadikan cover image.");
      } else {
        setPageMessage("Media artikel berhasil diupload dan disisipkan ke Article Content.");
      }
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Upload media artikel gagal.");
    } finally {
      setArticleContentUploading(false);
    }
  }

  async function onOpenArticleEditModal(row: Record<string, unknown>) {
    if (!accessToken) return;
    const id = asString(row.id);
    if (!id) {
      setPageError("ID artikel tidak ditemukan.");
      return;
    }

    clearFeedback();
    setArticleEditModalLoading(true);
    try {
      const detail = await getContentAdminById(accessToken, "articles", id);
      const form = toArticleEditForm({ ...row, ...detail, id });
      if (!form.id) {
        setPageError("Gagal membuka modal edit: ID artikel invalid.");
        return;
      }
      setArticleEditModal(form);
    } catch (error) {
      const fallback = toArticleEditForm(row);
      if (fallback.id) {
        setArticleEditModal(fallback);
      }
      setPageError(error instanceof Error ? error.message : "Gagal load detail artikel untuk edit.");
    } finally {
      setArticleEditModalLoading(false);
    }
  }

  function closeArticleEditModal() {
    setArticleEditModal(null);
  }

  async function onSaveArticleEditModal() {
    if (!accessToken || !articleEditModal) return;
    const id = articleEditModal.id.trim();
    if (!id) {
      setPageError("ID artikel tidak valid.");
      return;
    }

    clearFeedback();
    setArticleEditModalSaving(true);
    try {
      const payload = {
        title: articleEditModal.title.trim() || "Untitled",
        slug: articleEditModal.slug.trim() || undefined,
        excerpt: articleEditModal.excerpt.trim() || undefined,
        image_url: articleEditModal.image_url.trim() || undefined,
        content: articleEditModal.content || "<p></p>",
        is_featured: articleEditModal.is_featured,
        is_active: articleEditModal.is_active,
      };
      await updateContentAdmin(accessToken, "articles", id, payload);
      setPageMessage(`Article updated (${id}).`);
      setArticleEditModal(null);
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update article");
    } finally {
      setArticleEditModalSaving(false);
    }
  }

  async function onArchiveArticleFromModal() {
    if (!accessToken || !articleEditModal) return;
    const id = articleEditModal.id.trim();
    if (!id) {
      setPageError("ID artikel tidak valid.");
      return;
    }

    clearFeedback();
    setArticleEditModalArchiving(true);
    try {
      await archiveContentAdmin(accessToken, "articles", id);
      setPageMessage(`Article archived (${id}).`);
      setArticleEditModal(null);
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to archive article");
    } finally {
      setArticleEditModalArchiving(false);
    }
  }

  async function onCreate() {
    if (!accessToken) return;

    clearFeedback();
    try {
      const payload = parseJsonObject(createJson, "Create JSON");
      await createContentAdmin(accessToken, resource, payload);
      setPageMessage(`${resource} created.`);
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create content");
    }
  }

  async function onOpenResourceEditModal(row: Record<string, unknown>) {
    if (!accessToken) return;
    const id = asString(row.id);
    if (!id) {
      setPageError("ID data tidak ditemukan.");
      return;
    }

    clearFeedback();
    setResourceEditModalLoadingId(id);
    try {
      const detail = await getContentAdminById(accessToken, resource, id);
      const payload = toEditableResourcePayload({ ...row, ...detail });
      setResourceEditModal({
        id,
        payloadJson: JSON.stringify(payload, null, 2),
      });
    } catch (error) {
      const fallbackPayload = toEditableResourcePayload(row);
      setResourceEditModal({
        id,
        payloadJson: JSON.stringify(fallbackPayload, null, 2),
      });
      setPageError(error instanceof Error ? error.message : "Gagal load detail data.");
    } finally {
      setResourceEditModalLoadingId(null);
    }
  }

  function closeResourceEditModal() {
    setResourceEditModal(null);
    setUploadTarget("create");
  }

  async function onSaveResourceEditModal() {
    if (!accessToken || !resourceEditModal) return;
    const id = resourceEditModal.id.trim();
    if (!id) {
      setPageError("ID data tidak valid.");
      return;
    }

    clearFeedback();
    setResourceEditModalSaving(true);
    try {
      const payload = parseJsonObject(resourceEditModal.payloadJson, "Update JSON");
      await updateContentAdmin(accessToken, resource, id, payload);
      setPageMessage(`${resource} updated (${id}).`);
      setResourceEditModal(null);
      setUploadTarget("create");
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update content");
    } finally {
      setResourceEditModalSaving(false);
    }
  }

  async function onArchiveResourceFromModal() {
    if (!accessToken || !resourceEditModal) return;
    const id = resourceEditModal.id.trim();
    if (!id) {
      setPageError("ID data tidak valid.");
      return;
    }

    clearFeedback();
    setResourceEditModalArchiving(true);
    try {
      await archiveContentAdmin(accessToken, resource, id);
      setPageMessage(`${resource} archived (${id}).`);
      setResourceEditModal(null);
      setUploadTarget("create");
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to archive content");
    } finally {
      setResourceEditModalArchiving(false);
    }
  }

  async function onUpsertNationalMetric() {
    if (!accessToken) return;

    clearFeedback();
    try {
      await upsertNationalMetricAdmin(accessToken, {
        metric_code: metricCode.trim(),
        metric_date: metricDate,
        value_numeric: Number(metricValue || 0),
      });
      setPageMessage("National metric upserted.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to upsert national metric");
    }
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={<BookOpen size={28} />}
        title="Admin only"
        description="Halaman content untuk admin/superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Admin</CardTitle>
          <CardDescription>Console terstruktur untuk CRUD content resources dan national metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Resource"
              value={resource}
              onChange={(e) => setResource(e.target.value as ContentAdminResource)}
            >
              {RESOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Input label="Search q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="optional" />
            <div className="md:col-span-2 flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                leftIcon={<RefreshCw size={16} />}
                onClick={() => void loadRows()}
                isLoading={loading}
              >
                Refresh
              </Button>
              {isArticleResource ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdvancedSection((value) => !value)}
                >
                  {showAdvancedSection ? "Hide Advanced" : "Show Advanced"}
                </Button>
              ) : null}
            </div>
          </div>

          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{resource} List</CardTitle>
          <CardDescription>
            UUID tetap dipakai untuk identitas data. Di UI ditampilkan ringkas + nomor urut agar lebih mudah dibaca.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !loading ? (
            <EmptyState title="No data" description="Belum ada data untuk resource ini." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>No</TableHead>
                  {previewColumns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <TableRow key={`content-${String(row.id ?? index)}`}>
                    <TableCell>{index + 1}</TableCell>
                    {previewColumns.map((col) => (
                      <TableCell key={`${index}-${col}`}>{renderCell(row, col)}</TableCell>
                    ))}
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {isArticleResource ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void onOpenArticleEditModal(row)}
                            isLoading={articleEditModalLoading}
                            disabled={articleEditModalLoading}
                          >
                            Edit
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void onOpenResourceEditModal(row)}
                            isLoading={resourceEditModalLoadingId === String(row.id ?? "")}
                            disabled={resourceEditModalLoadingId !== null}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {mediaFieldOptions.length > 0 && (!isArticleResource || showAdvancedSection) ? (
        <Card>
          <CardHeader>
            <CardTitle>Media Upload (Cloudinary)</CardTitle>
            <CardDescription>
              Upload foto/video/file langsung ke Cloudinary, lalu URL otomatis masuk ke payload JSON.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Select
                label="Apply To"
                value={uploadTarget}
                onChange={(e) => setUploadTarget(e.target.value as UploadTarget)}
              >
                <option value="create">Create JSON</option>
                <option value="update" disabled={!resourceEditModal}>
                  Update JSON {resourceEditModal ? "" : "(buka modal Edit dulu)"}
                </option>
              </Select>
              <Select
                label="Field"
                value={uploadField}
                onChange={(e) => {
                  const field = e.target.value as MediaField;
                  setUploadField(field);
                  setUploadResourceType(MEDIA_RESOURCE_BY_FIELD[field]);
                }}
              >
                {mediaFieldOptions.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </Select>
              <Select
                label="Resource Type"
                value={uploadResourceType}
                onChange={(e) => setUploadResourceType(e.target.value as MediaResourceType)}
              >
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="raw">raw</option>
              </Select>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">File</span>
                <input
                  key={uploadInputKey}
                  type="file"
                  accept={uploadAccept(uploadResourceType)}
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                leftIcon={<UploadCloud size={16} />}
                onClick={() => void onUploadMedia()}
                isLoading={uploadingMedia}
              >
                Upload ke Cloudinary
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Atau isi URL manual</span>
                <input
                  className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  placeholder="https://res.cloudinary.com/..."
                  value={manualMediaUrl}
                  onChange={(e) => setManualMediaUrl(e.target.value)}
                />
              </label>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" onClick={() => onApplyManualMediaUrl("create")}>
                  Apply ke Create
                </Button>
                <Button type="button" variant="outline" onClick={() => onApplyManualMediaUrl("update")}>
                  Apply ke Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {resource === "articles" ? (
        <Card>
          <CardHeader>
            <CardTitle>Article Rich Editor (Tiptap)</CardTitle>
            <CardDescription>
              Form artikel sederhana: isi konten, upload media, preview, lalu simpan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input label="Title" value={articleDraftTitle} onChange={(e) => setArticleDraftTitle(e.target.value)} />
              <Input label="Slug (Optional)" value={articleDraftSlug} onChange={(e) => setArticleDraftSlug(e.target.value)} />
              <Input
                label="Excerpt (Optional)"
                value={articleDraftExcerpt}
                onChange={(e) => setArticleDraftExcerpt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Image URL (Optional)"
                value={articleDraftImageUrl}
                onChange={(e) => setArticleDraftImageUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={articleDraftFeatured}
                  onChange={(e) => setArticleDraftFeatured(e.target.checked)}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={articleDraftActive} onChange={(e) => setArticleDraftActive(e.target.checked)} />
                Active
              </label>
            </div>

            <RichTextEditor
              label="Article Content"
              value={articleDraftContentHtml}
              onChange={setArticleDraftContentHtml}
            />

            <div className="rounded-lg border border-[var(--color-border)] bg-slate-50 p-3 space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Upload Media ke Article Content</p>
                <p className="text-xs text-slate-600">
                  Upload foto/video, lalu sistem otomatis menyisipkan tag media ke isi artikel.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">File Media</span>
                  <input
                    key={articleContentUploadInputKey}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => setArticleContentUploadFile(e.target.files?.[0] ?? null)}
                    className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-semibold"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<UploadCloud size={16} />}
                    onClick={() => void onUploadArticleContentMedia()}
                    isLoading={articleContentUploading}
                  >
                    Upload + Insert
                  </Button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoSetCoverFromContentUpload}
                  onChange={(e) => setAutoSetCoverFromContentUpload(e.target.checked)}
                />
                Jadikan image upload sebagai cover (Image URL) otomatis
              </label>

              {articleContentPreviewUrl ? (
                <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Media Preview</p>
                  {articleContentPreviewType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={articleContentPreviewUrl}
                      alt="Article media preview"
                      className="max-h-72 w-auto max-w-full rounded-lg border border-[var(--color-border)] object-contain"
                    />
                  ) : articleContentPreviewType === "video" ? (
                    <video
                      controls
                      playsInline
                      src={articleContentPreviewUrl}
                      className="max-h-72 w-auto max-w-full rounded-lg border border-[var(--color-border)]"
                    />
                  ) : (
                    <a
                      href={articleContentPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[var(--color-primary)] underline"
                    >
                      Buka media
                    </a>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void onCreateArticleSimple()}>
                Simpan Baru
              </Button>
              <span className="self-center text-xs text-slate-500">
                Edit/Archive artikel lama melalui tombol Action -&gt; Edit.
              </span>
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-white p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Article Preview</p>
              <div
                className="prose prose-sm max-w-none [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_video]:h-auto [&_video]:max-w-full [&_video]:rounded-lg"
                dangerouslySetInnerHTML={{ __html: articleDraftContentHtml || "<p></p>" }}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isArticleResource || showAdvancedSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Create {resource}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea className="min-h-64 font-mono text-xs" value={createJson} onChange={(e) => setCreateJson(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onFormatCreateJson}>
                Validate & Format
              </Button>
              <Button type="button" onClick={() => void onCreate()}>
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!isArticleResource || showAdvancedSection ? (
        <Card>
          <CardHeader>
            <CardTitle>Upsert National Metric</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Metric Code" value={metricCode} onChange={(e) => setMetricCode(e.target.value)} />
            <Input label="Metric Date" type="date" value={metricDate} onChange={(e) => setMetricDate(e.target.value)} />
            <Input label="Value Numeric" type="number" value={metricValue} onChange={(e) => setMetricValue(e.target.value)} />
            <div className="flex items-end">
              <Button type="button" onClick={() => void onUpsertNationalMetric()}>
                Upsert
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {resourceEditModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !resourceEditModalSaving && !resourceEditModalArchiving) {
              closeResourceEditModal();
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="resource-edit-modal-title">
            <CardHeader>
              <CardTitle id="resource-edit-modal-title">Edit {resource}</CardTitle>
              <CardDescription>ID: {resourceEditModal.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                label="Update JSON"
                className="min-h-72 font-mono text-xs"
                value={resourceEditModal.payloadJson}
                onChange={(event) =>
                  setResourceEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          payloadJson: event.target.value,
                        }
                      : prev,
                  )
                }
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeResourceEditModal}
                  disabled={resourceEditModalSaving || resourceEditModalArchiving}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void onArchiveResourceFromModal()}
                  isLoading={resourceEditModalArchiving}
                  disabled={resourceEditModalSaving}
                >
                  Archive
                </Button>
                <Button type="button" onClick={() => void onSaveResourceEditModal()} isLoading={resourceEditModalSaving}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {articleEditModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !articleEditModalSaving && !articleEditModalArchiving) {
              closeArticleEditModal();
            }
          }}
        >
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="article-edit-modal-title">
            <CardHeader>
              <CardTitle id="article-edit-modal-title">Edit Article</CardTitle>
              <CardDescription>ID: {articleEditModal.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Input
                  label="Title"
                  value={articleEditModal.title}
                  onChange={(event) =>
                    setArticleEditModal((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                  }
                />
                <Input
                  label="Slug (Optional)"
                  value={articleEditModal.slug}
                  onChange={(event) =>
                    setArticleEditModal((prev) => (prev ? { ...prev, slug: event.target.value } : prev))
                  }
                />
                <Input
                  label="Excerpt (Optional)"
                  value={articleEditModal.excerpt}
                  onChange={(event) =>
                    setArticleEditModal((prev) => (prev ? { ...prev, excerpt: event.target.value } : prev))
                  }
                />
              </div>

              <Input
                label="Image URL (Optional)"
                value={articleEditModal.image_url}
                onChange={(event) =>
                  setArticleEditModal((prev) => (prev ? { ...prev, image_url: event.target.value } : prev))
                }
                placeholder="https://res.cloudinary.com/..."
              />

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={articleEditModal.is_featured}
                    onChange={(event) =>
                      setArticleEditModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              is_featured: event.target.checked,
                            }
                          : prev,
                      )
                    }
                  />
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={articleEditModal.is_active}
                    onChange={(event) =>
                      setArticleEditModal((prev) =>
                        prev
                          ? {
                              ...prev,
                              is_active: event.target.checked,
                            }
                          : prev,
                      )
                    }
                  />
                  Active
                </label>
              </div>

              <RichTextEditor
                label="Article Content"
                value={articleEditModal.content}
                onChange={(value) =>
                  setArticleEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          content: value,
                        }
                      : prev,
                  )
                }
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeArticleEditModal}
                  disabled={articleEditModalSaving || articleEditModalArchiving}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void onArchiveArticleFromModal()}
                  isLoading={articleEditModalArchiving}
                  disabled={articleEditModalSaving}
                >
                  Archive
                </Button>
                <Button type="button" onClick={() => void onSaveArticleEditModal()} isLoading={articleEditModalSaving}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
