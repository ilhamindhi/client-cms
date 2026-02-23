import { apiRequest } from "@/lib/http";

export type NutritionFoodItem = {
  id: string;
  name: string;
  brand?: string | null;
  serving_size?: string | null;
  calories: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  fiber_g: number | string;
  is_verified: boolean;
  source: string;
  created_at?: string;
  updated_at?: string;
};

export type ListFoodCatalogAdminQuery = {
  q?: string;
  is_verified?: boolean;
  limit?: number;
};

export type CreateFoodCatalogItemAdminPayload = {
  name: string;
  brand?: string;
  serving_size?: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  is_verified?: boolean;
  source?: string;
};

export type UpdateFoodCatalogItemAdminPayload = Partial<CreateFoodCatalogItemAdminPayload>;

export function listFoodCatalogAdmin(token: string, query: ListFoodCatalogAdminQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.is_verified !== undefined) params.set("is_verified", String(query.is_verified));
  params.set("limit", String(query.limit ?? 100));
  return apiRequest<NutritionFoodItem[]>(`/nutrition/foods?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function createFoodCatalogItemAdmin(token: string, payload: CreateFoodCatalogItemAdminPayload) {
  return apiRequest<NutritionFoodItem>("/nutrition/foods", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateFoodCatalogItemAdmin(
  token: string,
  foodId: string,
  payload: UpdateFoodCatalogItemAdminPayload
) {
  return apiRequest<NutritionFoodItem>(`/nutrition/foods/${foodId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function deleteFoodCatalogItemAdmin(token: string, foodId: string) {
  return apiRequest<{ id: string; deleted: boolean }>(`/nutrition/foods/${foodId}`, {
    method: "DELETE",
    token,
  });
}
