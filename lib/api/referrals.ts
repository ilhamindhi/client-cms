import { apiRequest } from "@/lib/http";

export function listReferralPayoutsAdmin(token: string, query: { status?: "pending" | "approved" | "rejected" | "paid"; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<Record<string, unknown>[]>(`/referrals/admin/payouts?${params.toString()}`, { method: "GET", token });
}

export function getReferralPayoutAdmin(token: string, payoutId: string) {
  return apiRequest<Record<string, unknown>>(`/referrals/admin/payouts/${payoutId}`, {
    method: "GET",
    token,
  });
}

export function updateReferralPayoutAdmin(
  token: string,
  payoutId: string,
  payload: { status: "approved" | "rejected" | "paid"; payout_reference?: string; note?: string }
) {
  return apiRequest<Record<string, unknown>>(`/referrals/admin/payouts/${payoutId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function createReferralCommissionAdmin(
  token: string,
  payload: {
    referrer_user_id: string;
    referred_user_id?: string;
    referral_usage_id?: string;
    trigger_type: "registration" | "topup" | "purchase" | "first_topup_auto" | "first_order_auto";
    amount_idr: number;
  }
) {
  return apiRequest<Record<string, unknown>>("/referrals/admin/commissions", { method: "POST", token, body: payload });
}
