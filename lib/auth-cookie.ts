import { CMS_SESSION_MODE, USE_HTTP_ONLY_SESSION_COOKIES } from "@/lib/session-mode";

export const ACCESS_TOKEN_COOKIE = "cms_access_token";
export const REFRESH_TOKEN_COOKIE = "cms_refresh_token";

type SyncSessionCookiesInput = {
  accessToken: string;
  refreshToken: string;
  expiresInSec?: number;
};

export function setAccessTokenCookie(token: string, maxAgeSec = 60 * 60 * 24) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
}

export function clearAccessTokenCookie() {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function requestSessionApi(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Session API failed (${response.status})`);
  }
}

export async function syncSessionCookies(input: SyncSessionCookiesInput) {
  if (!USE_HTTP_ONLY_SESSION_COOKIES) {
    setAccessTokenCookie(input.accessToken, input.expiresInSec || 60 * 60 * 24);
    return;
  }

  try {
    await requestSessionApi("/api/session", {
      method: "POST",
      body: JSON.stringify({
        access_token: input.accessToken,
        refresh_token: input.refreshToken,
        expires_in: input.expiresInSec,
      }),
    });
  } catch (error) {
    if (CMS_SESSION_MODE === "http_only") {
      throw error;
    }
    // Soft fallback for hybrid mode when local API route is temporarily unavailable.
    setAccessTokenCookie(input.accessToken, input.expiresInSec || 60 * 60 * 24);
  }
}

export async function clearSessionCookies() {
  clearAccessTokenCookie();
  if (!USE_HTTP_ONLY_SESSION_COOKIES) {
    return;
  }

  try {
    await requestSessionApi("/api/session", {
      method: "DELETE",
    });
  } catch {
    // Ignore cleanup failure to avoid blocking logout UX.
  }
}
