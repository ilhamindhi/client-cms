import { apiRequest } from "@/lib/http";

export function listRewardsAdmin(
  token: string,
  query: { q?: string; type?: string; status?: "active" | "inactive" | "draft" | "archived"; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<Record<string, unknown>[]>(`/points/admin/rewards?${params.toString()}`, { method: "GET", token });
}

export function createRewardAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/points/admin/rewards", { method: "POST", token, body: payload });
}

export function getRewardByIdAdmin(token: string, rewardId: string) {
  return apiRequest<Record<string, unknown>>(`/points/admin/rewards/${rewardId}`, {
    method: "GET",
    token,
  });
}

export function updateRewardAdmin(token: string, rewardId: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/points/admin/rewards/${rewardId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function disableRewardAdmin(token: string, rewardId: string) {
  return apiRequest<Record<string, unknown>>(`/points/admin/rewards/${rewardId}`, { method: "DELETE", token });
}

export function awardPointsAdmin(
  token: string,
  payload: { user_id: string; delta: number; event_type: string; description?: string }
) {
  return apiRequest<Record<string, unknown>>("/points/admin/ledger/award", { method: "POST", token, body: payload });
}

export function listRewardRedemptionsAdmin(
  token: string,
  query: { status?: string; user_id?: string; reward_id?: string; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.user_id) params.set("user_id", query.user_id);
  if (query.reward_id) params.set("reward_id", query.reward_id);
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<Record<string, unknown>[]>(`/points/admin/redemptions?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function updateRewardRedemptionStatusAdmin(
  token: string,
  redemptionId: string,
  payload: {
    status: "processing" | "shipped" | "fulfilled" | "rejected" | "canceled";
    note?: string;
    voucher_code?: string;
    tracking_number?: string;
    tracking_url?: string;
  }
) {
  return apiRequest<Record<string, unknown>>(`/points/admin/redemptions/${redemptionId}/status`, {
    method: "PATCH",
    token,
    body: payload,
  });
}
