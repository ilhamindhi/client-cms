import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookie";
import {
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
  clearSessionCookiesOnResponse,
} from "@/lib/server/session-config";

type SessionPayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

function badRequest(message: string) {
  return NextResponse.json(
    { success: false, message },
    {
      status: 400,
    }
  );
}

function asPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as SessionPayload | null;
  if (!payload) {
    return badRequest("Invalid JSON payload");
  }

  const accessToken = typeof payload.access_token === "string" ? payload.access_token : "";
  const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : "";
  const expiresInSec = asPositiveInt(payload.expires_in, 60 * 60 * 24);

  if (accessToken.length < 20) {
    return badRequest("access_token is invalid");
  }
  if (refreshToken.length < 20) {
    return badRequest("refresh_token is invalid");
  }

  const response = NextResponse.json({
    success: true,
    message: "Session cookies synced",
    data: { ok: true },
  });

  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    buildAccessCookieOptions(expiresInSec)
  );
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, buildRefreshCookieOptions());

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Session cookies cleared",
    data: { ok: true },
  });
  clearSessionCookiesOnResponse(response);
  return response;
}
