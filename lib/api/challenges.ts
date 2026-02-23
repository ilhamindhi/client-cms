import { apiRequest } from "@/lib/http";

export function listChallengesAdmin(
  token: string,
  query: { q?: string; is_active?: boolean; challenge_type?: string; difficulty?: string; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  if (query.challenge_type) params.set("challenge_type", query.challenge_type);
  if (query.difficulty) params.set("difficulty", query.difficulty);
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<Record<string, unknown>[]>(`/challenges/admin/challenges?${params.toString()}`, { method: "GET", token });
}

export function createChallengeAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/challenges/admin/challenges", { method: "POST", token, body: payload });
}

export function updateChallengeAdmin(token: string, id: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/challenges/admin/challenges/${id}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function archiveChallengeAdmin(token: string, id: string) {
  return apiRequest<Record<string, unknown>>(`/challenges/admin/challenges/${id}`, { method: "DELETE", token });
}

export function listAchievementsAdmin(
  token: string,
  query: { q?: string; is_active?: boolean; target_metric?: string; limit?: number; offset?: number } = {}
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.is_active !== undefined) params.set("is_active", String(query.is_active));
  if (query.target_metric) params.set("target_metric", query.target_metric);
  params.set("limit", String(query.limit ?? 50));
  params.set("offset", String(query.offset ?? 0));
  return apiRequest<Record<string, unknown>[]>(`/challenges/admin/achievements?${params.toString()}`, { method: "GET", token });
}

export function createAchievementAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/challenges/admin/achievements", { method: "POST", token, body: payload });
}

export function updateAchievementAdmin(token: string, id: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/challenges/admin/achievements/${id}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function archiveAchievementAdmin(token: string, id: string) {
  return apiRequest<Record<string, unknown>>(`/challenges/admin/achievements/${id}`, { method: "DELETE", token });
}
