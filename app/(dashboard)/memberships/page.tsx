"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, TicketPercent } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createMembershipCoupon,
  createMembershipPlan,
  disableMembershipCoupon,
  disableMembershipPlan,
  getMembershipCouponByIdAdmin,
  getMembershipPlanByIdAdmin,
  listMembershipCoupons,
  listMembershipPlansAdmin,
  updateMembershipCoupon,
  updateMembershipPlan,
} from "@/lib/api/membership";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { MembershipCoupon, MembershipPlan } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type PlanForm = {
  code: string;
  name: string;
  description: string;
  price_amount: string;
  billing_period: "none" | "monthly" | "yearly";
  is_free: boolean;
};

type CouponForm = {
  code: string;
  name: string;
  description: string;
  discount_type: "percent" | "nominal";
  discount_value: string;
  max_uses: string;
  max_uses_per_user: string;
  applies_to_plan_id: string;
};

type PlanEditForm = {
  code: string;
  name: string;
  description: string;
  price_amount: string;
  currency: string;
  billing_period: "none" | "monthly" | "yearly";
  is_free: boolean;
  is_active: boolean;
  tier_level: string;
  trial_days: string;
  sort_order: string;
};

type CouponEditForm = {
  code: string;
  name: string;
  description: string;
  discount_type: "percent" | "nominal";
  discount_value: string;
  max_discount_amount: string;
  max_uses: string;
  max_uses_per_user: string;
  applies_to_plan_id: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
};

const initialPlanForm: PlanForm = {
  code: "",
  name: "",
  description: "",
  price_amount: "0",
  billing_period: "monthly",
  is_free: false,
};

const initialCouponForm: CouponForm = {
  code: "",
  name: "",
  description: "",
  discount_type: "percent",
  discount_value: "10",
  max_uses: "",
  max_uses_per_user: "1",
  applies_to_plan_id: "",
};

const initialPlanEditForm: PlanEditForm = {
  code: "",
  name: "",
  description: "",
  price_amount: "0",
  currency: "IDR",
  billing_period: "monthly",
  is_free: false,
  is_active: true,
  tier_level: "0",
  trial_days: "0",
  sort_order: "0",
};

const initialCouponEditForm: CouponEditForm = {
  code: "",
  name: "",
  description: "",
  discount_type: "percent",
  discount_value: "0",
  max_discount_amount: "",
  max_uses: "",
  max_uses_per_user: "1",
  applies_to_plan_id: "",
  start_at: "",
  end_at: "",
  is_active: true,
};

const selectClassName =
  "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function asOptionalNumber(value: string) {
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

function formatCurrency(value: number | string) {
  const numeric = asNumber(value);
  return new Intl.NumberFormat("id-ID").format(Number.isFinite(numeric) ? numeric : 0);
}

export default function MembershipCouponsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [coupons, setCoupons] = useState<MembershipCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(initialPlanForm);
  const [couponForm, setCouponForm] = useState<CouponForm>(initialCouponForm);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [planEditModalOpen, setPlanEditModalOpen] = useState(false);
  const [planEditModalLoading, setPlanEditModalLoading] = useState(false);
  const [planEditModalSaving, setPlanEditModalSaving] = useState(false);
  const [planEditId, setPlanEditId] = useState("");
  const [planEditForm, setPlanEditForm] = useState<PlanEditForm>(initialPlanEditForm);
  const [couponEditModalOpen, setCouponEditModalOpen] = useState(false);
  const [couponEditModalLoading, setCouponEditModalLoading] = useState(false);
  const [couponEditModalSaving, setCouponEditModalSaving] = useState(false);
  const [couponEditId, setCouponEditId] = useState("");
  const [couponEditForm, setCouponEditForm] = useState<CouponEditForm>(initialCouponEditForm);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Memberships",
    successTitle: "Memberships",
  });

  async function loadData() {
    if (!accessToken || !hasAdminAccess) {
      return;
    }

    setLoading(true);
    setPageError(null);
    try {
      const [planRows, couponRows] = await Promise.all([
        listMembershipPlansAdmin(accessToken, 200),
        listMembershipCoupons(accessToken, { limit: 200 }),
      ]);
      setPlans(planRows);
      setCoupons(couponRows);
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to load membership data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  const activePlanOptions = useMemo(() => plans.filter((entry) => entry.is_active), [plans]);

  async function onCreatePlanSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setSavingPlan(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await createMembershipPlan(accessToken, {
        code: planForm.code.trim(),
        name: planForm.name.trim(),
        description: planForm.description.trim() || undefined,
        price_amount: asNumber(planForm.price_amount),
        currency: "IDR",
        billing_period: planForm.billing_period,
        is_free: planForm.is_free,
        is_active: true,
        tier_level: 0,
        trial_days: 0,
        sort_order: plans.length + 1,
      });
      setPlanForm(initialPlanForm);
      setPageMessage("Membership plan berhasil dibuat.");
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to create membership plan");
    } finally {
      setSavingPlan(false);
    }
  }

  async function onCreateCouponSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      return;
    }

    setSavingCoupon(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await createMembershipCoupon(accessToken, {
        code: couponForm.code.trim(),
        name: couponForm.name.trim(),
        description: couponForm.description.trim() || undefined,
        discount_type: couponForm.discount_type,
        discount_value: asNumber(couponForm.discount_value),
        max_uses: asOptionalNumber(couponForm.max_uses),
        max_uses_per_user: Math.max(1, asNumber(couponForm.max_uses_per_user)),
        applies_to_plan_id: couponForm.applies_to_plan_id || undefined,
        is_active: true,
      });
      setCouponForm(initialCouponForm);
      setPageMessage("Membership coupon berhasil dibuat.");
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to create coupon");
    } finally {
      setSavingCoupon(false);
    }
  }

  async function onTogglePlanActive(plan: MembershipPlan) {
    if (!accessToken) {
      return;
    }

    setRowActionId(plan.id);
    setPageError(null);
    setPageMessage(null);
    try {
      if (plan.is_active) {
        await disableMembershipPlan(accessToken, plan.id);
        setPageMessage(`Plan ${plan.name} dinonaktifkan.`);
      } else {
        await updateMembershipPlan(accessToken, plan.id, { is_active: true });
        setPageMessage(`Plan ${plan.name} diaktifkan.`);
      }
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update plan");
    } finally {
      setRowActionId(null);
    }
  }

  async function onToggleCouponActive(coupon: MembershipCoupon) {
    if (!accessToken) {
      return;
    }

    setRowActionId(coupon.id);
    setPageError(null);
    setPageMessage(null);
    try {
      if (coupon.is_active) {
        await disableMembershipCoupon(accessToken, coupon.id);
        setPageMessage(`Coupon ${coupon.code} dinonaktifkan.`);
      } else {
        await updateMembershipCoupon(accessToken, coupon.id, { is_active: true });
        setPageMessage(`Coupon ${coupon.code} diaktifkan.`);
      }
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update coupon");
    } finally {
      setRowActionId(null);
    }
  }

  async function onPreparePlanEdit(planId: string) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    setPlanEditId(planId);
    setPlanEditModalLoading(true);
    try {
      const detail = await getMembershipPlanByIdAdmin(accessToken, planId);
      setPlanEditId(detail.id);
      setPlanEditForm({
        code: detail.code ?? "",
        name: detail.name ?? "",
        description: detail.description ?? "",
        price_amount: String(asNumber(detail.price_amount)),
        currency: detail.currency ?? "IDR",
        billing_period: detail.billing_period ?? "monthly",
        is_free: Boolean(detail.is_free),
        is_active: Boolean(detail.is_active),
        tier_level: String(asNumber(detail.tier_level)),
        trial_days: String(asNumber(detail.trial_days)),
        sort_order: String(asNumber(detail.sort_order)),
      });
      setPlanEditModalOpen(true);
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to load plan detail");
    } finally {
      setPlanEditModalLoading(false);
    }
  }

  async function onSavePlanEdit() {
    if (!accessToken || !planEditId.trim()) {
      return;
    }
    if (!planEditForm.code.trim() || !planEditForm.name.trim()) {
      setPageError("Code dan name plan wajib diisi.");
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setPlanEditModalSaving(true);
    try {
      await updateMembershipPlan(accessToken, planEditId.trim(), {
        code: planEditForm.code.trim(),
        name: planEditForm.name.trim(),
        description: planEditForm.description.trim() || undefined,
        price_amount: Math.max(0, asNumber(planEditForm.price_amount)),
        currency: planEditForm.currency.trim().toUpperCase() || "IDR",
        billing_period: planEditForm.billing_period,
        is_free: planEditForm.is_free,
        is_active: planEditForm.is_active,
        tier_level: Math.max(0, Math.floor(asNumber(planEditForm.tier_level))),
        trial_days: Math.max(0, Math.floor(asNumber(planEditForm.trial_days))),
        sort_order: Math.max(0, Math.floor(asNumber(planEditForm.sort_order))),
      });
      setPlanEditModalOpen(false);
      setPageMessage("Membership plan updated.");
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update membership plan");
    } finally {
      setPlanEditModalSaving(false);
    }
  }

  async function onPrepareCouponEdit(couponId: string) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    setCouponEditId(couponId);
    setCouponEditModalLoading(true);
    try {
      const detail = await getMembershipCouponByIdAdmin(accessToken, couponId);
      setCouponEditId(detail.id);
      setCouponEditForm({
        code: detail.code ?? "",
        name: detail.name ?? "",
        description: detail.description ?? "",
        discount_type: detail.discount_type ?? "percent",
        discount_value: String(asNumber(detail.discount_value)),
        max_discount_amount: detail.max_discount_amount != null ? String(asNumber(detail.max_discount_amount)) : "",
        max_uses: detail.max_uses != null ? String(asNumber(detail.max_uses)) : "",
        max_uses_per_user: String(asNumber(detail.max_uses_per_user)),
        applies_to_plan_id: detail.applies_to_plan_id ?? "",
        start_at: toDateTimeLocalValue(detail.start_at),
        end_at: toDateTimeLocalValue(detail.end_at),
        is_active: Boolean(detail.is_active),
      });
      setCouponEditModalOpen(true);
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to load coupon detail");
    } finally {
      setCouponEditModalLoading(false);
    }
  }

  async function onSaveCouponEdit() {
    if (!accessToken || !couponEditId.trim()) {
      return;
    }
    if (!couponEditForm.code.trim() || !couponEditForm.name.trim()) {
      setPageError("Code dan name coupon wajib diisi.");
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setCouponEditModalSaving(true);
    try {
      await updateMembershipCoupon(accessToken, couponEditId.trim(), {
        code: couponEditForm.code.trim(),
        name: couponEditForm.name.trim(),
        description: couponEditForm.description.trim() || undefined,
        discount_type: couponEditForm.discount_type,
        discount_value: Math.max(0, asNumber(couponEditForm.discount_value)),
        max_discount_amount: asOptionalNumber(couponEditForm.max_discount_amount),
        max_uses: asOptionalNumber(couponEditForm.max_uses),
        max_uses_per_user: Math.max(1, Math.floor(asNumber(couponEditForm.max_uses_per_user))),
        applies_to_plan_id: couponEditForm.applies_to_plan_id || undefined,
        start_at: toIsoDateTime(couponEditForm.start_at),
        end_at: toIsoDateTime(couponEditForm.end_at),
        is_active: couponEditForm.is_active,
      });
      setCouponEditModalOpen(false);
      setPageMessage("Membership coupon updated.");
      await loadData();
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to update membership coupon");
    } finally {
      setCouponEditModalSaving(false);
    }
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={<TicketPercent size={28} />}
        title="Admin only"
        description="Halaman membership hanya untuk role admin atau superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership Plans & Coupons</CardTitle>
          <CardDescription>
            Manajemen plan membership dan coupon diskon premium yang sudah terhubung ke backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={loadData} isLoading={loading} leftIcon={<RefreshCw size={16} />}>
              Refresh
            </Button>
          </div>
          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Membership Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={onCreatePlanSubmit}>
            <Input
              label="Code"
              value={planForm.code}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="premium"
              required
            />
            <Input
              label="Name"
              value={planForm.name}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Premium"
              required
            />
            <Input
              label="Price (IDR)"
              type="number"
              min="0"
              value={planForm.price_amount}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, price_amount: event.target.value }))}
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Billing Period</span>
              <select
                className={selectClassName}
                value={planForm.billing_period}
                onChange={(event) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    billing_period: event.target.value as PlanForm["billing_period"],
                  }))
                }
              >
                <option value="none">none</option>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={planForm.is_free}
                onChange={(event) => setPlanForm((prev) => ({ ...prev, is_free: event.target.checked }))}
              />
              Is Free
            </label>
            <Input
              label="Description (Optional)"
              value={planForm.description}
              onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Plan premium bulanan"
            />
            <div className="lg:col-span-3">
              <Button type="submit" isLoading={savingPlan}>
                Save Plan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && plans.length === 0 ? (
            <Table aria-label="Loading plans">
              <thead>
                <tr>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={`plan-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
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
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : plans.length === 0 ? (
            <EmptyState title="Belum ada plan" description="Tambahkan membership plan pertama." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{plan.name}</div>
                      <div className="text-xs text-slate-500">{plan.code}</div>
                    </TableCell>
                    <TableCell>
                      Rp {formatCurrency(plan.price_amount)}
                      <div className="text-xs text-slate-500">{plan.billing_period}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? "success" : "danger"}>
                        {plan.is_active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(plan.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          isLoading={planEditModalLoading && planEditId === plan.id}
                          onClick={() => {
                            void onPreparePlanEdit(plan.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={plan.is_active ? "outline" : "secondary"}
                          isLoading={rowActionId === plan.id}
                          onClick={() => {
                            void onTogglePlanActive(plan);
                          }}
                        >
                          {plan.is_active ? "Disable" : "Enable"}
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
          <CardTitle>Create Membership Coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={onCreateCouponSubmit}>
            <Input
              label="Code"
              value={couponForm.code}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, code: event.target.value }))}
              placeholder="PROMO50"
              required
            />
            <Input
              label="Name"
              value={couponForm.name}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Promo 50%"
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Discount Type</span>
              <select
                className={selectClassName}
                value={couponForm.discount_type}
                onChange={(event) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    discount_type: event.target.value as CouponForm["discount_type"],
                  }))
                }
              >
                <option value="percent">percent</option>
                <option value="nominal">nominal</option>
              </select>
            </label>
            <Input
              label="Discount Value"
              type="number"
              min="1"
              value={couponForm.discount_value}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, discount_value: event.target.value }))}
              required
            />
            <Input
              label="Max Uses (Optional)"
              type="number"
              min="1"
              value={couponForm.max_uses}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, max_uses: event.target.value }))}
            />
            <Input
              label="Max Uses Per User"
              type="number"
              min="1"
              value={couponForm.max_uses_per_user}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, max_uses_per_user: event.target.value }))
              }
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Apply To Plan (Optional)</span>
              <select
                className={selectClassName}
                value={couponForm.applies_to_plan_id}
                onChange={(event) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    applies_to_plan_id: event.target.value,
                  }))
                }
              >
                <option value="">All plans</option>
                {activePlanOptions.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Description (Optional)"
              value={couponForm.description}
              onChange={(event) => setCouponForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Promo campaign Q1"
            />
            <div className="lg:col-span-3">
              <Button type="submit" isLoading={savingCoupon}>
                Save Coupon
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coupons List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && coupons.length === 0 ? (
            <Table aria-label="Loading coupons">
              <thead>
                <tr>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={`coupon-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : coupons.length === 0 ? (
            <EmptyState title="Belum ada coupon" description="Tambahkan coupon membership pertama." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Coupon</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{coupon.code}</div>
                      <div className="text-xs text-slate-500">{coupon.name}</div>
                    </TableCell>
                    <TableCell>
                      {coupon.discount_type === "percent"
                        ? `${asNumber(coupon.discount_value)}%`
                        : `Rp ${formatCurrency(coupon.discount_value)}`}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-700">
                        {asNumber(coupon.used_count ?? 0)} / {coupon.max_uses ?? "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        per-user: {asNumber(coupon.max_uses_per_user)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? "success" : "danger"}>
                        {coupon.is_active ? "active" : "inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          isLoading={couponEditModalLoading && couponEditId === coupon.id}
                          onClick={() => {
                            void onPrepareCouponEdit(coupon.id);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={coupon.is_active ? "outline" : "secondary"}
                          isLoading={rowActionId === coupon.id}
                          onClick={() => {
                            void onToggleCouponActive(coupon);
                          }}
                        >
                          {coupon.is_active ? "Disable" : "Enable"}
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

      {planEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !planEditModalSaving) {
              setPlanEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="membership-plan-edit-modal-title">
            <CardHeader>
              <CardTitle id="membership-plan-edit-modal-title">Edit Membership Plan</CardTitle>
              <CardDescription>ID: {planEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Code"
                value={planEditForm.code}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, code: event.target.value }))}
                required
              />
              <Input
                label="Name"
                value={planEditForm.name}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <Input
                label="Currency"
                value={planEditForm.currency}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, currency: event.target.value }))}
                required
              />
              <Input
                label="Price Amount"
                type="number"
                min="0"
                value={planEditForm.price_amount}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, price_amount: event.target.value }))}
                required
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Billing Period</span>
                <select
                  className={selectClassName}
                  value={planEditForm.billing_period}
                  onChange={(event) =>
                    setPlanEditForm((prev) => ({
                      ...prev,
                      billing_period: event.target.value as PlanEditForm["billing_period"],
                    }))
                  }
                >
                  <option value="none">none</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={planEditForm.is_free}
                  onChange={(event) => setPlanEditForm((prev) => ({ ...prev, is_free: event.target.checked }))}
                />
                Is Free
              </label>
              <Input
                label="Tier Level"
                type="number"
                min="0"
                value={planEditForm.tier_level}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, tier_level: event.target.value }))}
              />
              <Input
                label="Trial Days"
                type="number"
                min="0"
                value={planEditForm.trial_days}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, trial_days: event.target.value }))}
              />
              <Input
                label="Sort Order"
                type="number"
                min="0"
                value={planEditForm.sort_order}
                onChange={(event) => setPlanEditForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              />
              <div className="md:col-span-3">
                <Input
                  label="Description (Optional)"
                  value={planEditForm.description}
                  onChange={(event) => setPlanEditForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-slate-700 md:col-span-3">
                <input
                  type="checkbox"
                  checked={planEditForm.is_active}
                  onChange={(event) => setPlanEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Plan aktif
              </label>
              <div className="flex justify-end gap-2 md:col-span-3">
                <Button type="button" variant="ghost" onClick={() => setPlanEditModalOpen(false)} disabled={planEditModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onSavePlanEdit()} isLoading={planEditModalSaving}>
                  Save Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {couponEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !couponEditModalSaving) {
              setCouponEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="membership-coupon-edit-modal-title">
            <CardHeader>
              <CardTitle id="membership-coupon-edit-modal-title">Edit Membership Coupon</CardTitle>
              <CardDescription>ID: {couponEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Input
                label="Code"
                value={couponEditForm.code}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, code: event.target.value }))}
                required
              />
              <Input
                label="Name"
                value={couponEditForm.name}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Discount Type</span>
                <select
                  className={selectClassName}
                  value={couponEditForm.discount_type}
                  onChange={(event) =>
                    setCouponEditForm((prev) => ({
                      ...prev,
                      discount_type: event.target.value as CouponEditForm["discount_type"],
                    }))
                  }
                >
                  <option value="percent">percent</option>
                  <option value="nominal">nominal</option>
                </select>
              </label>
              <Input
                label="Discount Value"
                type="number"
                min="0"
                value={couponEditForm.discount_value}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, discount_value: event.target.value }))}
                required
              />
              <Input
                label="Max Discount Amount (Optional)"
                type="number"
                min="1"
                value={couponEditForm.max_discount_amount}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, max_discount_amount: event.target.value }))}
              />
              <Input
                label="Max Uses (Optional)"
                type="number"
                min="1"
                value={couponEditForm.max_uses}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, max_uses: event.target.value }))}
              />
              <Input
                label="Max Uses Per User"
                type="number"
                min="1"
                value={couponEditForm.max_uses_per_user}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, max_uses_per_user: event.target.value }))}
                required
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Applies To Plan (Optional)</span>
                <select
                  className={selectClassName}
                  value={couponEditForm.applies_to_plan_id}
                  onChange={(event) => setCouponEditForm((prev) => ({ ...prev, applies_to_plan_id: event.target.value }))}
                >
                  <option value="">All plans</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Start At (Optional)"
                type="datetime-local"
                value={couponEditForm.start_at}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, start_at: event.target.value }))}
              />
              <Input
                label="End At (Optional)"
                type="datetime-local"
                value={couponEditForm.end_at}
                onChange={(event) => setCouponEditForm((prev) => ({ ...prev, end_at: event.target.value }))}
              />
              <div className="md:col-span-3">
                <Input
                  label="Description (Optional)"
                  value={couponEditForm.description}
                  onChange={(event) => setCouponEditForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-slate-700 md:col-span-3">
                <input
                  type="checkbox"
                  checked={couponEditForm.is_active}
                  onChange={(event) => setCouponEditForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Coupon aktif
              </label>
              <div className="flex justify-end gap-2 md:col-span-3">
                <Button type="button" variant="ghost" onClick={() => setCouponEditModalOpen(false)} disabled={couponEditModalSaving}>
                  Close
                </Button>
                <Button type="button" variant="secondary" onClick={() => void onSaveCouponEdit()} isLoading={couponEditModalSaving}>
                  Save Coupon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
