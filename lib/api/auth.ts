import { apiRequest } from "@/lib/http";
import type {
  AdminUser,
  AuthTokenSet,
  AuthUser,
  CreateAdminUserResult,
  SuperadminForceLogoutResult,
  SuperadminResetPasswordResult,
  UserRole,
  UserStatus,
} from "@/lib/types";

type LoginPayload = {
  email: string;
  password: string;
};

type CreateAdminPayload = {
  email: string;
  password?: string;
  display_name?: string;
};

async function requestCmsSessionApi<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
  } = {}
) {
  const response = await fetch(path, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  type Envelope = { success?: boolean; message?: string; data?: T };
  let payload: Envelope | null = null;
  try {
    payload = (await response.json()) as Envelope;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Session request failed (${response.status})`);
  }
  if (!payload || payload.success !== true || payload.data === undefined) {
    throw new Error(payload?.message || "Invalid session response");
  }

  return payload.data;
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthTokenSet>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<AuthTokenSet>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function refreshSessionFromCookie() {
  return requestCmsSessionApi<AuthTokenSet>("/api/session/refresh", {
    method: "POST",
  });
}

export function getMe(token: string) {
  return apiRequest<AuthUser>("/auth/me", {
    method: "GET",
    token,
  });
}

export function logout(token: string, refreshToken?: string | null) {
  return apiRequest<{ revoked: boolean }>("/auth/logout", {
    method: "POST",
    token,
    body: {
      refresh_token: refreshToken || undefined,
    },
  });
}

export function listAdminUsers(
  token: string,
  query: {
    q?: string;
    limit?: number;
    offset?: number;
    role?: UserRole;
    status?: UserStatus | string;
  } = {},
) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", String(query.status));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminUser[]>(`/auth/admin/users${suffix}`, {
    method: "GET",
    token,
  });
}

export function createAdminUser(token: string, payload: CreateAdminPayload) {
  return apiRequest<CreateAdminUserResult>("/auth/superadmin/admin-users", {
    method: "POST",
    token,
    body: payload,
  });
}

export function setUserStatus(
  token: string,
  userId: string,
  payload: {
    status: UserStatus;
    reason?: string;
  },
) {
  return apiRequest<AdminUser & { revoked_sessions: number }>(`/auth/superadmin/users/${userId}/status`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function forceLogoutUserSessions(token: string, userId: string, payload: { reason?: string } = {}) {
  return apiRequest<SuperadminForceLogoutResult>(`/auth/superadmin/users/${userId}/force-logout`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function resetUserPassword(
  token: string,
  userId: string,
  payload: { new_password?: string } = {},
) {
  return apiRequest<SuperadminResetPasswordResult>(`/auth/superadmin/users/${userId}/reset-password`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function setUserRoles(token: string, userId: string, payload: { roles: UserRole[] }) {
  return apiRequest<AdminUser>(`/auth/superadmin/users/${userId}/roles`, {
    method: "PATCH",
    token,
    body: payload,
  });
}
