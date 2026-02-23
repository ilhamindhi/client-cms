"use client";

import { useEffect, useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { deleteMediaAdmin, listMediaAdmin } from "@/lib/api/media";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

export default function MediaPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");
  const canManageRiskyOps = hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Media",
    successTitle: "Media",
  });

  const [ownerUserId, setOwnerUserId] = useState("");
  const [resourceType, setResourceType] = useState<"" | "image" | "video" | "raw">("");
  const [status, setStatus] = useState<"" | "active" | "deleted">("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteModalSaving, setDeleteModalSaving] = useState(false);
  const [deleteMediaId, setDeleteMediaId] = useState("");
  const [deleteMediaPublicId, setDeleteMediaPublicId] = useState("");
  const [deleteDestroyRemote, setDeleteDestroyRemote] = useState(true);
  const [deleteInvalidate, setDeleteInvalidate] = useState(true);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  async function loadRows() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const data = await listMediaAdmin(accessToken, {
        owner_user_id: ownerUserId || undefined,
        resource_type: resourceType || undefined,
        status: status || undefined,
        limit: 100,
      });
      setRows(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  function onPrepareDelete(row: Record<string, unknown>) {
    if (!canManageRiskyOps) {
      setPageError("Aksi delete media hanya untuk superadmin.");
      return;
    }
    setDeleteMediaId(String(row.id ?? ""));
    setDeleteMediaPublicId(String(row.public_id ?? ""));
    setDeleteDestroyRemote(true);
    setDeleteInvalidate(true);
    setDeleteConfirmed(false);
    setDeleteReason("");
    setDeleteModalOpen(true);
  }

  async function onDeleteMedia() {
    if (!accessToken || !deleteMediaId.trim()) return;
    if (!canManageRiskyOps) {
      setPageError("Aksi delete media hanya untuk superadmin.");
      return;
    }
    if (!deleteConfirmed) {
      setPageError("Centang konfirmasi delete media sebelum melanjutkan.");
      return;
    }
    if (!deleteReason.trim()) {
      setPageError("Reason delete media wajib diisi.");
      return;
    }

    clearFeedback();
    setDeleteModalSaving(true);
    try {
      await deleteMediaAdmin(accessToken, deleteMediaId.trim(), {
        destroy_remote: deleteDestroyRemote,
        invalidate: deleteInvalidate,
        reason: deleteReason.trim(),
      });
      setPageMessage(`Media ${deleteMediaId.trim()} deleted.`);
      setDeleteModalOpen(false);
      await loadRows();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to delete media");
    } finally {
      setDeleteModalSaving(false);
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<ImageIcon size={28} />} title="Admin only" description="Halaman media untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Media Admin</CardTitle>
          <CardDescription>List seluruh media asset yang tersimpan di Cloudinary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageRiskyOps ? (
            <Alert variant="info">Role admin bisa lihat/filter media, tetapi delete hanya superadmin.</Alert>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Owner User ID" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} placeholder="uuid" />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Resource Type</span>
              <select className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm" value={resourceType} onChange={(e) => setResourceType(e.target.value as "" | "image" | "video" | "raw")}>
                <option value="">all</option>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="raw">raw</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value as "" | "active" | "deleted")}>
                <option value="">all</option>
                <option value="active">active</option>
                <option value="deleted">deleted</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadRows()} isLoading={loading}>
                Refresh
              </Button>
            </div>
          </div>

          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Media Assets</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 && !loading ? (
            <EmptyState title="No media" description="Belum ada data media sesuai filter." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Public ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <TableRow key={`media-${index}`}>
                    <TableCell>{String(row.id ?? "-")}</TableCell>
                    <TableCell>{String(row.owner_user_id ?? "-")}</TableCell>
                    <TableCell>{String(row.resource_type ?? "-")}</TableCell>
                    <TableCell>
                      <Badge variant={String(row.status) === "active" ? "success" : "warning"}>{String(row.status ?? "-")}</Badge>
                    </TableCell>
                    <TableCell>{String(row.public_id ?? "-")}</TableCell>
                    <TableCell>{formatDateTime((row.created_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => onPrepareDelete(row)}
                        disabled={!canManageRiskyOps}
                        title={!canManageRiskyOps ? "Hanya superadmin" : undefined}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteModalSaving) {
              setDeleteModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-xl" role="dialog" aria-modal="true" aria-labelledby="media-delete-modal-title">
            <CardHeader>
              <CardTitle id="media-delete-modal-title">Delete Media</CardTitle>
              <CardDescription>ID: {deleteMediaId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="info">
                Media <strong>{deleteMediaPublicId || deleteMediaId}</strong> akan dihapus dari database{deleteDestroyRemote ? " dan Cloudinary" : ""}.
              </Alert>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deleteDestroyRemote} onChange={(e) => setDeleteDestroyRemote(e.target.checked)} />
                Destroy remote asset di Cloudinary
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deleteInvalidate} onChange={(e) => setDeleteInvalidate(e.target.checked)} />
                Invalidate CDN cache
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} />
                Saya konfirmasi hapus media ini
              </label>
              <Input
                label="Reason Delete"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Alasan penghapusan media"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDeleteModalOpen(false)} disabled={deleteModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="danger" onClick={() => void onDeleteMedia()} isLoading={deleteModalSaving}>
                  Delete Media
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
