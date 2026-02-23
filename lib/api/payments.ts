import { apiRequest } from "@/lib/http";

export type PaymentMethodAdminItem = {
  id: string;
  code: string;
  name: string;
  channel: string;
  provider: string;
  is_active: boolean;
  updated_at?: string;
};

export function listPaymentMethodsAdmin(
  token: string,
  query: { is_active?: boolean; channel?: string; provider?: string } = {}
) {
  const params = new URLSearchParams();
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  if (query.channel) params.set("channel", query.channel);
  if (query.provider) params.set("provider", query.provider);
  return apiRequest<PaymentMethodAdminItem[]>(`/payments/admin/methods?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function createPaymentMethodAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/payments/admin/methods", { method: "POST", token, body: payload });
}

export function getPaymentMethodByCodeAdmin(token: string, code: string) {
  return apiRequest<Record<string, unknown>>(`/payments/admin/methods/${code}`, {
    method: "GET",
    token,
  });
}

export function updatePaymentMethodAdmin(token: string, code: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/payments/admin/methods/${code}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function reconcilePaymentsAdmin(
  token: string,
  payload: { limit?: number; lookback_days?: number; dry_run?: boolean } = {}
) {
  return apiRequest<Record<string, unknown>>("/payments/admin/reconcile", { method: "POST", token, body: payload });
}

export function retryPaymentWebhooksAdmin(
  token: string,
  payload: { limit?: number; max_retry?: number; dry_run?: boolean } = {}
) {
  return apiRequest<Record<string, unknown>>("/payments/admin/webhooks/retry", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getPaymentReconcileReportAdmin(
  token: string,
  query: { limit?: number; lookback_days?: number; dry_run?: boolean } = {}
) {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.lookback_days !== undefined) params.set("lookback_days", String(query.lookback_days));
  if (query.dry_run !== undefined) params.set("dry_run", String(query.dry_run));
  return apiRequest<Record<string, unknown>>(`/payments/admin/reconcile?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function getPaymentWebhookRetryReportAdmin(
  token: string,
  query: { limit?: number; max_retry?: number; dry_run?: boolean } = {}
) {
  const params = new URLSearchParams();
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.max_retry !== undefined) params.set("max_retry", String(query.max_retry));
  if (query.dry_run !== undefined) params.set("dry_run", String(query.dry_run));
  return apiRequest<Record<string, unknown>>(`/payments/admin/webhooks/retry?${params.toString()}`, {
    method: "GET",
    token,
  });
}
