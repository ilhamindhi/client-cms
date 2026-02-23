import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { getBackendApiBaseUrl } from "@/lib/server/backend-api";
import {
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
  clearSessionCookiesOnResponse,
} from "@/lib/server/session-config";
import type { AuthTokenSet } from "@/lib/types";

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

async function parseEnvelope<T>(response: Response) {
  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }
  return payload;
}

export async function POST(request: Request) {
  const refreshToken = request.headers.get("x-cms-refresh-token") || "";
  let tokenFromCookie = refreshToken;
  if (!tokenFromCookie) {
    const cookieStore = await cookies();
    tokenFromCookie = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || "";
  }

  if (!tokenFromCookie || tokenFromCookie.length < 20) {
    const unauthorized = NextResponse.json(
      {
        success: false,
        message: "Refresh cookie is missing",
      },
      {
        status: 401,
      }
    );
    clearSessionCookiesOnResponse(unauthorized);
    return unauthorized;
  }

  const response = await fetch(`${getBackendApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: tokenFromCookie,
    }),
    cache: "no-store",
  });

  const payload = await parseEnvelope<AuthTokenSet>(response);
  if (!response.ok || payload?.success !== true || !payload.data) {
    const unauthorized = NextResponse.json(
      {
        success: false,
        message: payload?.message || "Session refresh failed",
      },
      {
        status: 401,
      }
    );
    clearSessionCookiesOnResponse(unauthorized);
    return unauthorized;
  }

  const data = payload.data;
  const nextResponse = NextResponse.json({
    success: true,
    message: "Session refreshed",
    data,
  });

  nextResponse.cookies.set(
    ACCESS_TOKEN_COOKIE,
    data.access_token,
    buildAccessCookieOptions(data.expires_in || 60 * 60 * 24)
  );
  nextResponse.cookies.set(REFRESH_TOKEN_COOKIE, data.refresh_token, buildRefreshCookieOptions());

  return nextResponse;
}
