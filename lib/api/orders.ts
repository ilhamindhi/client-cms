import { apiRequest } from "@/lib/http";

export type OrderAdminItem = {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  grand_total?: number | string;
  created_at?: string;
  updated_at?: string;
};

export function listOrdersAdmin(
  token: string,
  query: { status?: string; payment_status?: string; user_id?: string; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.payment_status) params.set("payment_status", query.payment_status);
  if (query.user_id) params.set("user_id", query.user_id);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  return apiRequest<OrderAdminItem[]>(`/orders/admin?${params.toString()}`, { method: "GET", token });
}

export function getOrderAdmin(token: string, orderId: string) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/${orderId}`, { method: "GET", token });
}

export function updateOrderStatusAdmin(
  token: string,
  orderId: string,
  payload: { status: "pending" | "processing" | "shipped" | "delivered" | "completed" | "canceled"; note?: string }
) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/${orderId}/status`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function createOrderShipmentAdmin(
  token: string,
  orderId: string,
  payload: {
    courier_name: string;
    tracking_number: string;
    courier_code?: string;
    service_name?: string;
    tracking_url?: string;
    eta_at?: string;
    payload_json?: Record<string, unknown>;
  }
) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/${orderId}/shipments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function refundOrderAdmin(
  token: string,
  orderId: string,
  payload: {
    amount_idr?: number;
    reason: string;
    restock_items?: boolean;
    provider_reference?: string;
    confirm_high_value?: boolean;
    approval_note?: string;
  }
) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/${orderId}/refund`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateShipmentAdmin(
  token: string,
  shipmentId: string,
  payload: {
    status: "pending" | "shipped" | "delivered" | "returned" | "canceled";
    courier_code?: string;
    tracking_url?: string;
    eta_at?: string;
    payload_json?: Record<string, unknown>;
  }
) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/shipments/${shipmentId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function syncShipmentTrackingAdmin(token: string, shipmentId: string, payload: { force?: boolean } = {}) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/shipments/${shipmentId}/sync-tracking`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listOrderCouponsAdmin(token: string, query: { is_active?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  params.set("limit", String(query.limit ?? 100));
  return apiRequest<Record<string, unknown>[]>(`/orders/admin/coupons?${params.toString()}`, { method: "GET", token });
}

export function getOrderCouponAdmin(token: string, couponId: string) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/coupons/${couponId}`, { method: "GET", token });
}

export function createOrderCouponAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/orders/admin/coupons", { method: "POST", token, body: payload });
}

export function updateOrderCouponAdmin(token: string, couponId: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/coupons/${couponId}`, { method: "PATCH", token, body: payload });
}

export function disableOrderCouponAdmin(token: string, couponId: string) {
  return apiRequest<Record<string, unknown>>(`/orders/admin/coupons/${couponId}`, { method: "DELETE", token });
}
