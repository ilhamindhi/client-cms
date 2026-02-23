"use client";

import { useEffect, useState } from "react";
import { Network, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";
import {
  createReferralCommissionAdmin,
  getReferralPayoutAdmin,
  listReferralPayoutsAdmin,
  updateReferralPayoutAdmin,
} from "@/lib/api/referrals";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

const PAYOUT_STATUS_OPTIONS = ["pending", "approved", "rejected", "paid"] as const;
type PayoutStatus = (typeof PAYOUT_STATUS_OPTIONS)[number];

const PAYOUT_UPDATE_STATUS_OPTIONS = ["approved", "rejected", "paid"] as const;
type PayoutUpdateStatus = (typeof PAYOUT_UPDATE_STATUS_OPTIONS)[number];

const TRIGGER_TYPE_OPTIONS = ["registration", "topup", "purchase", "first_topup_auto", "first_order_auto"] as const;
type TriggerType = (typeof TRIGGER_TYPE_OPTIONS)[number];

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function ReferralsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"" | PayoutStatus>("");
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [referrerUserId, setReferrerUserId] = useState("");
  const [referredUserId, setReferredUserId] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("purchase");
  const [amountIdr, setAmountIdr] = useState("1000");

  const [payoutId, setPayoutId] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<PayoutUpdateStatus>("approved");
  const [payoutReference, setPayoutReference] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutModalSaving, setPayoutModalSaving] = useState(false);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Referrals",
    successTitle: "Referrals",
  });

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  async function loadPayouts() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const rows = await listReferralPayoutsAdmin(accessToken, {
        status: (statusFilter || undefined) as "pending" | "approved" | "rejected" | "paid",
        limit: 100,
      });
      setPayouts(rows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load referral payouts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateCommission(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!referrerUserId.trim()) {
      setPageError("Referrer user ID wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createReferralCommissionAdmin(accessToken, {
        referrer_user_id: referrerUserId.trim(),
        referred_user_id: asOptionalText(referredUserId),
        trigger_type: triggerType,
        amount_idr: asNumber(amountIdr, 0),
      });
      setReferrerUserId("");
      setReferredUserId("");
      setTriggerType("purchase");
      setAmountIdr("1000");
      setPageMessage("Affiliate commission created.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create commission");
    }
  }

  async function onPreparePayoutUpdate(entry: Record<string, unknown>) {
    if (!accessToken) return;
    clearFeedback();
    const id = String(entry.id ?? "");
    if (!id) return;

    setPayoutModalSaving(true);
    try {
      const detail = await getReferralPayoutAdmin(accessToken, id);
      const raw = String(detail.status ?? "approved");
      if (raw === "rejected" || raw === "paid" || raw === "approved") {
        setPayoutStatus(raw);
      } else {
        setPayoutStatus("approved");
      }
      setPayoutReference(String(detail.payout_reference ?? ""));
      setPayoutNote(String(detail.note ?? ""));
      setPayoutId(id);
      setPayoutModalOpen(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load payout detail");
    } finally {
      setPayoutModalSaving(false);
    }
  }

  async function onUpdatePayout() {
    if (!accessToken || !payoutId.trim()) return;

    clearFeedback();
    setPayoutModalSaving(true);
    try {
      await updateReferralPayoutAdmin(accessToken, payoutId.trim(), {
        status: payoutStatus,
        payout_reference: asOptionalText(payoutReference),
        note: asOptionalText(payoutNote),
      });
      setPageMessage(`Payout ${payoutId.trim()} updated.`);
      setPayoutModalOpen(false);
      await loadPayouts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update payout");
    } finally {
      setPayoutModalSaving(false);
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<Network size={28} />} title="Admin only" description="Halaman referrals untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referrals Admin</CardTitle>
          <CardDescription>Kelola affiliate commission dan payout request.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | PayoutStatus)}
            >
              <option value="">all</option>
              {PAYOUT_STATUS_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <div className="flex items-end md:col-span-3">
              <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadPayouts()} isLoading={loading}>
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
          <CardTitle>Create Commission</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateCommission}>
            <Input label="Referrer User ID" value={referrerUserId} onChange={(e) => setReferrerUserId(e.target.value)} required />
            <Input label="Referred User ID (Optional)" value={referredUserId} onChange={(e) => setReferredUserId(e.target.value)} />
            <Select label="Trigger Type" value={triggerType} onChange={(e) => setTriggerType(e.target.value as TriggerType)}>
              {TRIGGER_TYPE_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Input label="Amount IDR" type="number" min="1" value={amountIdr} onChange={(e) => setAmountIdr(e.target.value)} required />
            <div className="md:col-span-4">
              <Button type="submit">Create Commission</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 && !loading ? (
            <EmptyState title="No payouts" description="Belum ada payout requests." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {payouts.map((entry, index) => (
                  <TableRow key={`payout-${index}`}>
                    <TableCell>{String(entry.id ?? "-")}</TableCell>
                    <TableCell>{String(entry.user_id ?? "-")}</TableCell>
                    <TableCell>Rp {Number(entry.amount_idr ?? 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                      <Badge variant={String(entry.status) === "paid" ? "success" : "warning"}>{String(entry.status ?? "-")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((entry.created_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => void onPreparePayoutUpdate(entry)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {payoutModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !payoutModalSaving) {
              setPayoutModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="referral-payout-edit-modal-title">
            <CardHeader>
              <CardTitle id="referral-payout-edit-modal-title">Edit Payout</CardTitle>
              <CardDescription>ID: {payoutId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                label="Status"
                value={payoutStatus}
                onChange={(e) => setPayoutStatus(e.target.value as PayoutUpdateStatus)}
              >
                {PAYOUT_UPDATE_STATUS_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
              <Input label="Payout Reference (Optional)" value={payoutReference} onChange={(e) => setPayoutReference(e.target.value)} />
              <Textarea
                label="Note (Optional)"
                className="md:col-span-2"
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="Keterangan payout"
              />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setPayoutModalOpen(false)} disabled={payoutModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdatePayout()} isLoading={payoutModalSaving}>
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
