"use client";

import { useEffect } from "react";
import { getMe, refreshSession } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";

type Props = {
  children: React.ReactNode;
};

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export default function TokenRefreshProvider({ children }: Props) {
  const { refreshToken, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const currentRefreshToken = refreshToken;
    if (!currentRefreshToken) {
      return;
    }

    let cancelled = false;

    async function runRefresh(token: string) {
      try {
        const refreshed = await refreshSession(token);
        const nextUser = refreshed.user || (await getMe(refreshed.access_token));

        if (cancelled) {
          return;
        }

        setAuth({
          user: nextUser,
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresInSec: refreshed.expires_in,
        });
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      }
    }

    const timer = setInterval(() => {
      void runRefresh(currentRefreshToken);
    }, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [clearAuth, refreshToken, setAuth]);

  return <>{children}</>;
}
