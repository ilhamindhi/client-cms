"use client";

import { useEffect } from "react";
import { getMe, refreshSession, refreshSessionFromCookie } from "@/lib/api/auth";
import { USE_HTTP_ONLY_SESSION_COOKIES } from "@/lib/session-mode";
import { useAuthStore } from "@/lib/stores/auth-store";

type Props = {
  children: React.ReactNode;
};

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export default function TokenRefreshProvider({ children }: Props) {
  const {
    isHydrated,
    user,
    accessToken,
    refreshToken,
    setAuth,
    clearAuth,
    setSessionRestoring,
  } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    let cancelled = false;

    async function runRefresh(preferCookie = false) {
      const shouldUseCookie = USE_HTTP_ONLY_SESSION_COOKIES && (preferCookie || !refreshToken);
      if (!shouldUseCookie && !refreshToken) {
        return false;
      }

      let refreshed;
      if (shouldUseCookie) {
        refreshed = await refreshSessionFromCookie();
      } else {
        if (!refreshToken) {
          return false;
        }
        refreshed = await refreshSession(refreshToken);
      }
      const nextUser = refreshed.user || (await getMe(refreshed.access_token));

      if (cancelled) {
        return false;
      }

      setAuth({
        user: nextUser,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresInSec: refreshed.expires_in,
      });

      return true;
    }

    async function bootstrapSession() {
      const needsBootstrap = USE_HTTP_ONLY_SESSION_COOKIES
        ? !accessToken
        : !accessToken && Boolean(refreshToken);
      if (!needsBootstrap) {
        return;
      }

      setSessionRestoring(true);
      try {
        await runRefresh(true);
      } catch {
        if (!cancelled && user) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          setSessionRestoring(false);
        }
      }
    }

    void bootstrapSession();

    const timer = setInterval(() => {
      const hasSession = Boolean(accessToken || refreshToken);
      if (!hasSession) {
        return;
      }

      void runRefresh(USE_HTTP_ONLY_SESSION_COOKIES).catch(() => {
        if (!cancelled) {
          clearAuth();
        }
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    accessToken,
    clearAuth,
    isHydrated,
    refreshToken,
    setAuth,
    setSessionRestoring,
    user,
  ]);

  return <>{children}</>;
}
