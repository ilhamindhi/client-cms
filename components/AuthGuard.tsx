"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

type Props = {
  children: React.ReactNode;
};

const PUBLIC_PATHS = ["/auth/login"];

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isSessionRestoring, accessToken } = useAuthStore();

  useEffect(() => {
    if (!isHydrated || isSessionRestoring) {
      return;
    }

    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
    if (isPublic) {
      return;
    }

    if (!accessToken) {
      const redirectTo = encodeURIComponent(pathname || "/");
      router.replace(`/auth/login?redirect=${redirectTo}`);
    }
  }, [accessToken, isHydrated, isSessionRestoring, pathname, router]);

  if (!isHydrated || isSessionRestoring) {
    return (
      <div className="grid min-h-screen place-content-center">
        <div className="text-center">
          <div className="mx-auto mb-3 size-10 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--color-primary)]" />
          <p className="text-sm text-slate-500">Loading session...</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (!isPublic && !accessToken) {
    return null;
  }

  return <>{children}</>;
}
