"use client";

import { useEffect, useState } from "react";
import { Gift, RefreshCw } from "lucide-react";
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
  awardPointsAdmin,
  createRewardAdmin,
  disableRewardAdmin,
  getRewardByIdAdmin,
  listRewardRedemptionsAdmin,
  listRewardsAdmin,
  updateRewardAdmin,
  updateRewardRedemptionStatusAdmin,
} from "@/lib/api/rewards";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

const REWARD_STATUS_OPTIONS = ["active", "draft", "inactive", "archived"] as const;
type RewardStatus = (typeof REWARD_STATUS_OPTIONS)[number];

const REDEMPTION_FILTER_STATUS_OPTIONS = ["pending", "processing", "shipped", "fulfilled", "rejected", "canceled"] as const;
type RedemptionFilterStatus = (typeof REDEMPTION_FILTER_STATUS_OPTIONS)[number];

const REDEMPTION_UPDATE_STATUS_OPTIONS = ["processing", "shipped", "fulfilled", "rejected", "canceled"] as const;
type RedemptionUpdateStatus = (typeof REDEMPTION_UPDATE_STATUS_OPTIONS)[number];

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parseRewardStatus(value: unknown, fallback: RewardStatus = "active"): RewardStatus {
  if (value === "active" || value === "draft" || value === "inactive" || value === "archived") return value;
  return fallback;
}

export default function RewardsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState<Record<string, unknown>[]>([]);
  const [redemptions, setRedemptions] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [rewardStatusFilter, setRewardStatusFilter] = useState<"" | RewardStatus>("");
  const [redemptionStatusFilter, setRedemptionStatusFilter] = useState<"" | RedemptionFilterStatus>("");

  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardType, setRewardType] = useState("voucher");
  const [pointsCost, setPointsCost] = useState("100");
  const [rewardStock, setRewardStock] = useState("0");

  const [rewardEditModalOpen, setRewardEditModalOpen] = useState(false);
  const [rewardEditModalSaving, setRewardEditModalSaving] = useState(false);
  const [rewardEditId, setRewardEditId] = useState("");
  const [rewardEditType, setRewardEditType] = useState("voucher");
  const [rewardEditTitle, setRewardEditTitle] = useState("");
  const [rewardEditPointsCost, setRewardEditPointsCost] = useState("0");
  const [rewardEditStock, setRewardEditStock] = useState("0");
  const [rewardEditStatus, setRewardEditStatus] = useState<RewardStatus>("active");
  const [rewardEditImageUrl, setRewardEditImageUrl] = useState("");
  const [rewardEditIsFlashDeal, setRewardEditIsFlashDeal] = useState(false);
  const [rewardEditIsVoucher, setRewardEditIsVoucher] = useState(false);
  const [rewardEditIsDonation, setRewardEditIsDonation] = useState(false);

  const [awardUserId, setAwardUserId] = useState("");
  const [awardDelta, setAwardDelta] = useState("100");
  const [awardEventType, setAwardEventType] = useState("manual_admin_award");
  const [awardDescription, setAwardDescription] = useState("");

  const [redemptionId, setRedemptionId] = useState("");
  const [redemptionStatus, setRedemptionStatus] = useState<RedemptionUpdateStatus>("processing");
  const [redemptionNote, setRedemptionNote] = useState("");
  const [redemptionVoucherCode, setRedemptionVoucherCode] = useState("");
  const [redemptionTrackingNumber, setRedemptionTrackingNumber] = useState("");
  const [redemptionTrackingUrl, setRedemptionTrackingUrl] = useState("");
  const [redemptionModalOpen, setRedemptionModalOpen] = useState(false);
  const [redemptionModalSaving, setRedemptionModalSaving] = useState(false);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Rewards",
    successTitle: "Rewards",
  });

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  async function loadData() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const [rewardRows, redemptionRows] = await Promise.all([
        listRewardsAdmin(accessToken, {
          status: rewardStatusFilter || undefined,
          limit: 100,
          offset: 0,
        }),
        listRewardRedemptionsAdmin(accessToken, {
          status: redemptionStatusFilter || undefined,
          limit: 100,
          offset: 0,
        }),
      ]);
      setRewards(rewardRows);
      setRedemptions(redemptionRows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load rewards data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateReward(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!rewardTitle.trim()) {
      setPageError("Reward title wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createRewardAdmin(accessToken, {
        type: rewardType.trim(),
        title: rewardTitle.trim(),
        points_cost: Math.max(0, Math.floor(asNumber(pointsCost, 0))),
        stock: Math.max(0, Math.floor(asNumber(rewardStock, 0))),
        status: "active",
      });
      setRewardTitle("");
      setRewardType("voucher");
      setPointsCost("100");
      setRewardStock("0");
      setPageMessage("Reward created.");
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create reward");
    }
  }

  async function onPrepareRewardEdit(row: Record<string, unknown>) {
    if (!accessToken) return;
    const rewardId = String(row.id ?? "");
    if (!rewardId) return;

    clearFeedback();
    try {
      const detail = await getRewardByIdAdmin(accessToken, rewardId);
      setRewardEditId(String(detail.id ?? rewardId));
      setRewardEditType(String(detail.type ?? "voucher"));
      setRewardEditTitle(String(detail.title ?? ""));
      setRewardEditPointsCost(String(detail.points_cost ?? "0"));
      setRewardEditStock(String(detail.stock ?? "0"));
      setRewardEditStatus(parseRewardStatus(detail.status));
      setRewardEditImageUrl(String(detail.image_url ?? ""));
      setRewardEditIsFlashDeal(Boolean(detail.is_flash_deal));
      setRewardEditIsVoucher(Boolean(detail.is_voucher));
      setRewardEditIsDonation(Boolean(detail.is_donation));
      setRewardEditModalOpen(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load reward detail");
    }
  }

  async function onUpdateReward() {
    if (!accessToken || !rewardEditId.trim()) return;
    if (!rewardEditTitle.trim()) {
      setPageError("Reward title wajib diisi.");
      return;
    }

    clearFeedback();
    setRewardEditModalSaving(true);
    try {
      await updateRewardAdmin(accessToken, rewardEditId.trim(), {
        type: rewardEditType.trim(),
        title: rewardEditTitle.trim(),
        points_cost: Math.max(0, Math.floor(asNumber(rewardEditPointsCost, 0))),
        stock: Math.max(0, Math.floor(asNumber(rewardEditStock, 0))),
        status: rewardEditStatus,
        image_url: asOptionalText(rewardEditImageUrl),
        is_flash_deal: rewardEditIsFlashDeal,
        is_voucher: rewardEditIsVoucher,
        is_donation: rewardEditIsDonation,
      });
      setPageMessage(`Reward ${rewardEditId.trim()} updated.`);
      setRewardEditModalOpen(false);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update reward");
    } finally {
      setRewardEditModalSaving(false);
    }
  }

  async function onDisableReward(rewardId: string) {
    if (!accessToken || !rewardId) return;

    clearFeedback();
    try {
      await disableRewardAdmin(accessToken, rewardId);
      setPageMessage(`Reward ${rewardId} disabled.`);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to disable reward");
    }
  }

  async function onAwardPoints(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!awardUserId.trim()) {
      setPageError("User ID wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await awardPointsAdmin(accessToken, {
        user_id: awardUserId.trim(),
        delta: Math.trunc(asNumber(awardDelta, 0)),
        event_type: awardEventType.trim() || "manual_admin_award",
        description: asOptionalText(awardDescription),
      });
      setPageMessage("Points awarded.");
      setAwardUserId("");
      setAwardDelta("100");
      setAwardEventType("manual_admin_award");
      setAwardDescription("");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to award points");
    }
  }

  function onPrepareRedemptionUpdate(row: Record<string, unknown>) {
    setRedemptionId(String(row.id ?? ""));
    const currentStatus = String(row.status ?? "processing");
    if (REDEMPTION_UPDATE_STATUS_OPTIONS.includes(currentStatus as RedemptionUpdateStatus)) {
      setRedemptionStatus(currentStatus as RedemptionUpdateStatus);
    } else {
      setRedemptionStatus("processing");
    }
    setRedemptionNote("");
    setRedemptionVoucherCode("");
    setRedemptionTrackingNumber("");
    setRedemptionTrackingUrl("");
    setRedemptionModalOpen(true);
  }

  async function onUpdateRedemptionStatus() {
    if (!accessToken || !redemptionId.trim()) return;

    clearFeedback();
    setRedemptionModalSaving(true);
    try {
      await updateRewardRedemptionStatusAdmin(accessToken, redemptionId.trim(), {
        status: redemptionStatus,
        note: asOptionalText(redemptionNote),
        voucher_code: asOptionalText(redemptionVoucherCode),
        tracking_number: asOptionalText(redemptionTrackingNumber),
        tracking_url: asOptionalText(redemptionTrackingUrl),
      });
      setPageMessage(`Redemption ${redemptionId.trim()} updated.`);
      setRedemptionModalOpen(false);
      await loadData();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update redemption");
    } finally {
      setRedemptionModalSaving(false);
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<Gift size={28} />} title="Admin only" description="Halaman rewards untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rewards Admin</CardTitle>
          <CardDescription>Kelola rewards, fulfillment redemption, dan manual points award.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Select
              label="Reward Status"
              value={rewardStatusFilter}
              onChange={(e) => setRewardStatusFilter(e.target.value as "" | RewardStatus)}
            >
              <option value="">all</option>
              {REWARD_STATUS_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Select
              label="Redemption Status"
              value={redemptionStatusFilter}
              onChange={(e) => setRedemptionStatusFilter(e.target.value as "" | RedemptionFilterStatus)}
            >
              <option value="">all</option>
              {REDEMPTION_FILTER_STATUS_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <div className="flex items-end md:col-span-2">
              <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadData()} isLoading={loading}>
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
          <CardTitle>Create Reward</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateReward}>
            <Input label="Type" value={rewardType} onChange={(e) => setRewardType(e.target.value)} required />
            <Input label="Title" value={rewardTitle} onChange={(e) => setRewardTitle(e.target.value)} required />
            <Input label="Points Cost" type="number" min="0" value={pointsCost} onChange={(e) => setPointsCost(e.target.value)} required />
            <Input label="Stock" type="number" min="0" value={rewardStock} onChange={(e) => setRewardStock(e.target.value)} required />
            <div className="md:col-span-4">
              <Button type="submit">Create Reward</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rewards List</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 && !loading ? (
            <EmptyState title="No rewards" description="Belum ada rewards." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {rewards.map((row, index) => (
                  <TableRow key={`reward-${index}`}>
                    <TableCell>{String(row.id ?? "-")}</TableCell>
                    <TableCell>{String(row.type ?? "-")}</TableCell>
                    <TableCell>{String(row.title ?? "-")}</TableCell>
                    <TableCell>{String(row.points_cost ?? "-")}</TableCell>
                    <TableCell>
                      <Badge variant={String(row.status) === "active" ? "success" : "warning"}>{String(row.status ?? "-")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((row.updated_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void onPrepareRewardEdit(row)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => void onDisableReward(String(row.id ?? ""))}>
                          Disable
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

      <Card>
        <CardHeader>
          <CardTitle>Award Points</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onAwardPoints}>
            <Input label="User ID" value={awardUserId} onChange={(e) => setAwardUserId(e.target.value)} required />
            <Input label="Delta" type="number" value={awardDelta} onChange={(e) => setAwardDelta(e.target.value)} required />
            <Input label="Event Type" value={awardEventType} onChange={(e) => setAwardEventType(e.target.value)} required />
            <div className="flex items-end">
              <Button type="submit">Award</Button>
            </div>
            <Textarea
              label="Description (Optional)"
              className="md:col-span-4"
              value={awardDescription}
              onChange={(e) => setAwardDescription(e.target.value)}
              placeholder="Keterangan manual awarding points"
            />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reward Redemptions</CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <EmptyState title="No redemptions" description="Belum ada redemption." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((row, index) => (
                  <TableRow key={`redemption-${index}`}>
                    <TableCell>{String(row.id ?? "-")}</TableCell>
                    <TableCell>{String(row.user_email ?? row.user_id ?? "-")}</TableCell>
                    <TableCell>{String(row.reward_title ?? row.reward_id ?? "-")}</TableCell>
                    <TableCell>
                      <Badge variant={String(row.status) === "fulfilled" ? "success" : "info"}>{String(row.status ?? "-")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((row.requested_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => onPrepareRedemptionUpdate(row)}>
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

      {rewardEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !rewardEditModalSaving) {
              setRewardEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="reward-edit-modal-title">
            <CardHeader>
              <CardTitle id="reward-edit-modal-title">Edit Reward</CardTitle>
              <CardDescription>ID: {rewardEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Type" value={rewardEditType} onChange={(e) => setRewardEditType(e.target.value)} required />
              <Input label="Title" value={rewardEditTitle} onChange={(e) => setRewardEditTitle(e.target.value)} required />
              <Input
                label="Points Cost"
                type="number"
                min="0"
                value={rewardEditPointsCost}
                onChange={(e) => setRewardEditPointsCost(e.target.value)}
                required
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                value={rewardEditStock}
                onChange={(e) => setRewardEditStock(e.target.value)}
                required
              />
              <Select label="Status" value={rewardEditStatus} onChange={(e) => setRewardEditStatus(e.target.value as RewardStatus)}>
                {REWARD_STATUS_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
              <Input
                label="Image URL (Optional)"
                value={rewardEditImageUrl}
                onChange={(e) => setRewardEditImageUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={rewardEditIsFlashDeal} onChange={(e) => setRewardEditIsFlashDeal(e.target.checked)} />
                Flash Deal
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={rewardEditIsVoucher} onChange={(e) => setRewardEditIsVoucher(e.target.checked)} />
                Voucher
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={rewardEditIsDonation} onChange={(e) => setRewardEditIsDonation(e.target.checked)} />
                Donation
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setRewardEditModalOpen(false)} disabled={rewardEditModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdateReward()} isLoading={rewardEditModalSaving}>
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {redemptionModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !redemptionModalSaving) {
              setRedemptionModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="reward-redemption-edit-modal-title">
            <CardHeader>
              <CardTitle id="reward-redemption-edit-modal-title">Edit Redemption Fulfillment</CardTitle>
              <CardDescription>ID: {redemptionId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <Select
                label="Status"
                value={redemptionStatus}
                onChange={(e) => setRedemptionStatus(e.target.value as RedemptionUpdateStatus)}
              >
                {REDEMPTION_UPDATE_STATUS_OPTIONS.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
              <Input label="Voucher Code (Optional)" value={redemptionVoucherCode} onChange={(e) => setRedemptionVoucherCode(e.target.value)} />
              <Input label="Tracking Number (Optional)" value={redemptionTrackingNumber} onChange={(e) => setRedemptionTrackingNumber(e.target.value)} />
              <Input label="Tracking URL (Optional)" value={redemptionTrackingUrl} onChange={(e) => setRedemptionTrackingUrl(e.target.value)} />
              <Textarea
                label="Note (Optional)"
                className="md:col-span-4"
                value={redemptionNote}
                onChange={(e) => setRedemptionNote(e.target.value)}
                placeholder="Catatan admin untuk fulfillment"
              />
              <div className="flex justify-end gap-2 md:col-span-4">
                <Button type="button" variant="ghost" onClick={() => setRedemptionModalOpen(false)} disabled={redemptionModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onUpdateRedemptionStatus()} isLoading={redemptionModalSaving}>
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
