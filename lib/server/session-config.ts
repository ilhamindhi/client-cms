import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookie";
import type { CmsSessionMode } from "@/lib/session-mode";
import type { NextResponse } from "next/server";

function parseSessionMode(raw: string | undefined): CmsSessionMode {
  const normalized = (raw || "").trim().toLowerCase();
  if (normalized === "legacy" || normalized === "hybrid" || normalized === "http_only") {
    return normalized;
  }
  return "hybrid";
}

function parseBoolean(raw: string | undefined, fallback: boolean) {
  if (!raw) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseNumber(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export const serverSessionMode = parseSessionMode(
  process.env.CMS_SESSION_MODE ?? process.env.NEXT_PUBLIC_CMS_SESSION_MODE
);

export const useHttpOnlySessionCookies = serverSessionMode !== "legacy";

export const sessionCookieDomain = process.env.CMS_SESSION_COOKIE_DOMAIN?.trim() || undefined;

export const sessionCookieSecure = parseBoolean(
  process.env.CMS_SESSION_COOKIE_SECURE,
  process.env.NODE_ENV === "production"
);

export const refreshCookieMaxAgeSec = parseNumber(
  process.env.CMS_REFRESH_COOKIE_MAX_AGE_SEC,
  30 * 24 * 60 * 60
);

export function buildAccessCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: useHttpOnlySessionCookies,
    secure: sessionCookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(1, Math.floor(maxAgeSec || 60 * 60 * 24)),
    ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {}),
  };
}

export function buildRefreshCookieOptions() {
  return {
    httpOnly: useHttpOnlySessionCookies,
    secure: sessionCookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: refreshCookieMaxAgeSec,
    ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {}),
  };
}

export function clearSessionCookiesOnResponse(response: NextResponse) {
  const options = {
    httpOnly: useHttpOnlySessionCookies,
    secure: sessionCookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {}),
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", options);
}
