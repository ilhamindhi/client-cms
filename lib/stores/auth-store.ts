"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clearSessionCookies, syncSessionCookies } from "@/lib/auth-cookie";
import {
  CMS_SESSION_MODE,
  PERSIST_TOKENS_TO_LOCAL_STORAGE,
} from "@/lib/session-mode";
import type { AuthUser } from "@/lib/types";

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  isSessionRestoring: boolean;
  setAuth: (payload: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    expiresInSec?: number;
  }) => void;
  clearAuth: () => void;
  markHydrated: () => void;
  setSessionRestoring: (value: boolean) => void;
  hasRole: (role: "admin" | "superadmin") => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrated: false,
      isSessionRestoring: false,
      setAuth: ({ user, accessToken, refreshToken, expiresInSec }) => {
        set({
          user,
          accessToken,
          refreshToken,
          isSessionRestoring: false,
        });

        void syncSessionCookies({
          accessToken,
          refreshToken,
          expiresInSec: expiresInSec || 60 * 60 * 24,
        }).catch(() => {
          if (CMS_SESSION_MODE === "http_only") {
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isSessionRestoring: false,
            });
          }
        });
      },
      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isSessionRestoring: false,
        });
        void clearSessionCookies();
      },
      markHydrated: () => {
        set({ isHydrated: true });
      },
      setSessionRestoring: (value) => {
        set({ isSessionRestoring: value });
      },
      hasRole: (role) => (get().user?.roles || []).includes(role),
    }),
    {
      name: "cms-auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        ...(PERSIST_TOKENS_TO_LOCAL_STORAGE
          ? {
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
            }
          : {}),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.markHydrated();
        }
      },
    }
  )
);
