import { apiRequest } from "@/lib/http";
import type { AdminUser, AuthTokenSet, AuthUser, CreateAdminUserResult } from "@/lib/types";

type LoginPayload = {
  email: string;
  password: string;
};

type CreateAdminPayload = {
  email: string;
  password?: string;
  display_name?: string;
};

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

export function listAdminUsers(token: string) {
  return apiRequest<AdminUser[]>("/auth/admin/users", {
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
