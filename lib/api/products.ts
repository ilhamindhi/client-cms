import { apiRequest } from "@/lib/http";

export type ProductAdminItem = {
  id: string;
  title: string;
  category?: string | null;
  price_amount: number | string;
  stock?: number | string;
  is_active?: boolean;
  is_featured?: boolean;
  updated_at?: string;
  created_at?: string;
};

export function listProductsAdmin(
  token: string,
  query: { q?: string; category?: string; is_active?: boolean; is_featured?: boolean; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  if (query.is_featured !== undefined) params.set("is_featured", String(query.is_featured));
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<ProductAdminItem[]>(`/products/admin?${params.toString()}`, { method: "GET", token });
}

export function getProductAdmin(token: string, id: string) {
  return apiRequest<Record<string, unknown>>(`/products/admin/${id}`, { method: "GET", token });
}

export function createProductAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/products/admin", { method: "POST", token, body: payload });
}

export function updateProductAdmin(token: string, id: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/products/admin/${id}`, { method: "PATCH", token, body: payload });
}

export function disableProductAdmin(token: string, id: string, reason: string) {
  const params = new URLSearchParams();
  params.set("reason", reason);
  return apiRequest<Record<string, unknown>>(`/products/admin/${id}?${params.toString()}`, {
    method: "DELETE",
    token,
  });
}

export function adjustProductStockAdmin(
  token: string,
  id: string,
  payload: { delta: number; reason: string; reference_type?: string; reference_id?: string }
) {
  return apiRequest<Record<string, unknown>>(`/products/admin/${id}/stock/adjust`, { method: "POST", token, body: payload });
}

export function listProductStockMovementsAdmin(
  token: string,
  id: string,
  query: { limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<Record<string, unknown>[]>(`/products/admin/${id}/stock/movements?${params.toString()}`, {
    method: "GET",
    token,
  });
}
