import { apiRequest } from "@/lib/http";

export type MediaResourceType = "image" | "video" | "raw";
export type MediaStatus = "active" | "deleted";

export type CreateMediaSignUploadInput = {
  resource_type?: MediaResourceType;
  folder?: string;
  public_id?: string;
  tags?: string[];
  context?: Record<string, string>;
  upload_preset?: string;
  eager?: string[];
  overwrite?: boolean;
  invalidate?: boolean;
  return_delete_token?: boolean;
};

export type CreateMediaSignUploadResponse = {
  cloud_name: string;
  api_key: string;
  resource_type: MediaResourceType;
  upload_url: string;
  upload_params: Record<string, string | number | boolean>;
};

export type ConfirmMediaUploadInput = {
  asset_id: string;
  public_id: string;
  resource_type: MediaResourceType;
  type?: string;
  version?: string | number;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
  secure_url: string;
  url?: string;
  thumbnail_url?: string;
  original_filename?: string;
  folder?: string;
  tags?: string[];
  context?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export function listMediaAdmin(
  token: string,
  query: {
    owner_user_id?: string;
    resource_type?: MediaResourceType;
    status?: MediaStatus;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (query.owner_user_id) params.set("owner_user_id", query.owner_user_id);
  if (query.resource_type) params.set("resource_type", query.resource_type);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 50));
  return apiRequest<Record<string, unknown>[]>(`/media/admin?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export function createMediaSignUpload(token: string, payload: CreateMediaSignUploadInput) {
  return apiRequest<CreateMediaSignUploadResponse>("/media/sign-upload", {
    method: "POST",
    token,
    body: payload,
  });
}

export function confirmMediaUpload(token: string, payload: ConfirmMediaUploadInput) {
  return apiRequest<Record<string, unknown>>("/media/confirm", {
    method: "POST",
    token,
    body: payload,
  });
}

export function deleteMediaAdmin(
  token: string,
  id: string,
  query: { destroy_remote?: boolean; invalidate?: boolean; reason?: string } = {},
) {
  const params = new URLSearchParams();
  if (query.destroy_remote !== undefined) params.set("destroy_remote", String(query.destroy_remote));
  if (query.invalidate !== undefined) params.set("invalidate", String(query.invalidate));
  if (query.reason) params.set("reason", query.reason);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return apiRequest<Record<string, unknown>>(`/media/${id}${suffix}`, {
    method: "DELETE",
    token,
  });
}
