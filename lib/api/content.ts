import { apiRequest } from "@/lib/http";

export type ContentAdminResource =
  | "article-categories"
  | "articles"
  | "events"
  | "workouts"
  | "meditations"
  | "recipes";

function buildPath(resource: ContentAdminResource) {
  return `/content/admin/${resource}`;
}

export function listContentAdmin(
  token: string,
  resource: ContentAdminResource,
  query: Record<string, string | number | boolean | undefined> = {}
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const suffix = params.toString();
  return apiRequest<Record<string, unknown>[]>(`${buildPath(resource)}${suffix ? `?${suffix}` : ""}`, {
    method: "GET",
    token,
  });
}

export function createContentAdmin(token: string, resource: ContentAdminResource, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(buildPath(resource), { method: "POST", token, body: payload });
}

export function getContentAdminById(token: string, resource: ContentAdminResource, id: string) {
  return apiRequest<Record<string, unknown>>(`${buildPath(resource)}/${id}`, {
    method: "GET",
    token,
  });
}

export function updateContentAdmin(
  token: string,
  resource: ContentAdminResource,
  id: string,
  payload: Record<string, unknown>
) {
  return apiRequest<Record<string, unknown>>(`${buildPath(resource)}/${id}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function archiveContentAdmin(token: string, resource: ContentAdminResource, id: string) {
  return apiRequest<Record<string, unknown>>(`${buildPath(resource)}/${id}`, { method: "DELETE", token });
}

export function upsertNationalMetricAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/content/admin/national-metrics/upsert", {
    method: "POST",
    token,
    body: payload,
  });
}
