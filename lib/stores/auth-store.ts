"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clearAccessTokenCookie, setAccessTokenCookie } from "@/lib/auth-cookie";
import type { AuthUser } from "@/lib/types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  setAuth: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresInSec?: number;
  }) => void;
  clearAuth: () => void;
  markHydrated: () => void;
  hasRole: (role: "admin" | "superadmin") => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      setAuth: ({ user, accessToken, refreshToken, expiresInSec }) => {
        set({
          user,
          accessToken,
          refreshToken,
        });
        setAccessTokenCookie(accessToken, expiresInSec || 60 * 60 * 24);
      },
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
        clearAccessTokenCookie();
      },
      markHydrated: () => {
        set({ isHydrated: true });
      },
      hasRole: (role) => (get().user?.roles || []).includes(role),
    }),
    {
      name: "cms-auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.markHydrated();
        }
      },
    },
  ),
);
