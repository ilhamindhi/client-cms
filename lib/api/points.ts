import { apiRequest } from "@/lib/http";
import type { GiftCode } from "@/lib/types";

type ListGiftCodesQuery = {
  q?: string;
  reward_type?: "points_random" | "membership";
  is_active?: boolean;
  limit?: number;
  offset?: number;
};

type CreateGiftCodePayload = {
  code: string;
  title: string;
  description?: string;
  reward_type: "points_random" | "membership";
  points_pool_total?: number;
  random_min_points: number;
  random_max_points?: number;
  max_points_per_user?: number;
  max_claim_per_user: number;
  max_redemptions?: number;
  membership_plan_id?: string;
  membership_duration_days: number;
  start_at?: string;
  end_at?: string;
  is_active: boolean;
};

type UpdateGiftCodePayload = Partial<CreateGiftCodePayload>;

export function listGiftCodesAdmin(token: string, query: ListGiftCodesQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.reward_type) {
    params.set("reward_type", query.reward_type);
  }
  if (query.is_active !== undefined) {
    params.set("is_active", String(query.is_active));
  }
  params.set("limit", String(query.limit ?? 100));
  params.set("offset", String(query.offset ?? 0));

  return apiRequest<GiftCode[]>(`/points/admin/gift-codes?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function getGiftCodeByIdAdmin(token: string, giftCodeId: string) {
  return apiRequest<GiftCode>(`/points/admin/gift-codes/${giftCodeId}`, {
    method: "GET",
    token,
  });
}

export function createGiftCode(token: string, payload: CreateGiftCodePayload) {
  return apiRequest<GiftCode>("/points/admin/gift-codes", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateGiftCode(token: string, giftCodeId: string, payload: UpdateGiftCodePayload) {
  return apiRequest<GiftCode>(`/points/admin/gift-codes/${giftCodeId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function getRewardByIdAdmin(token: string, rewardId: string) {
  return apiRequest<Record<string, unknown>>(`/points/admin/rewards/${rewardId}`, {
    method: "GET",
    token,
  });
}
