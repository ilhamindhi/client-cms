export const ACCESS_TOKEN_COOKIE = "cms_access_token";

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
