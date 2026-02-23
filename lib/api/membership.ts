import { apiRequest } from "@/lib/http";
import type { MembershipCoupon, MembershipPlan } from "@/lib/types";

type ListCouponsQuery = {
  is_active?: boolean;
  limit?: number;
};

type CreatePlanPayload = {
  code: string;
  name: string;
  description?: string;
  price_amount: number;
  currency: string;
  billing_period: "none" | "monthly" | "yearly";
  is_free: boolean;
  is_active: boolean;
  tier_level: number;
  trial_days: number;
  sort_order: number;
};

type UpdatePlanPayload = Partial<CreatePlanPayload>;

type CreateCouponPayload = {
  code: string;
  name: string;
  description?: string;
  discount_type: "percent" | "nominal";
  discount_value: number;
  max_discount_amount?: number;
  max_uses?: number;
  max_uses_per_user: number;
  applies_to_plan_id?: string;
  start_at?: string;
  end_at?: string;
  is_active: boolean;
};

type UpdateCouponPayload = Partial<CreateCouponPayload>;

export function listMembershipPlansAdmin(token: string, limit = 100) {
  return apiRequest<MembershipPlan[]>(`/memberships/admin/plans?limit=${limit}`, {
    method: "GET",
    token,
  });
}

export function getMembershipPlanByIdAdmin(token: string, planId: string) {
  return apiRequest<MembershipPlan>(`/memberships/admin/plans/${planId}`, {
    method: "GET",
    token,
  });
}

export function createMembershipPlan(token: string, payload: CreatePlanPayload) {
  return apiRequest<MembershipPlan>("/memberships/admin/plans", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateMembershipPlan(token: string, planId: string, payload: UpdatePlanPayload) {
  return apiRequest<MembershipPlan>(`/memberships/admin/plans/${planId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function disableMembershipPlan(token: string, planId: string) {
  return apiRequest<MembershipPlan>(`/memberships/admin/plans/${planId}`, {
    method: "DELETE",
    token,
  });
}

export function listMembershipCoupons(token: string, query: ListCouponsQuery = {}) {
  const params = new URLSearchParams();
  if (query.is_active !== undefined) {
    params.set("is_active", String(query.is_active));
  }
  params.set("limit", String(query.limit ?? 100));

  return apiRequest<MembershipCoupon[]>(`/memberships/admin/coupons?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function getMembershipCouponByIdAdmin(token: string, couponId: string) {
  return apiRequest<MembershipCoupon>(`/memberships/admin/coupons/${couponId}`, {
    method: "GET",
    token,
  });
}

export function createMembershipCoupon(token: string, payload: CreateCouponPayload) {
  return apiRequest<MembershipCoupon>("/memberships/admin/coupons", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateMembershipCoupon(token: string, couponId: string, payload: UpdateCouponPayload) {
  return apiRequest<MembershipCoupon>(`/memberships/admin/coupons/${couponId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function disableMembershipCoupon(token: string, couponId: string) {
  return apiRequest<MembershipCoupon>(`/memberships/admin/coupons/${couponId}`, {
    method: "DELETE",
    token,
  });
}
