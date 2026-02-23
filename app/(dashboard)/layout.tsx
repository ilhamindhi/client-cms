"use client";

import { useState } from "react";
import { ShieldX } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { hasRole, clearAuth } = useAuthStore();

  const hasAccess = hasRole("admin") || hasRole("superadmin");

  return (
      <AuthGuard>
      {hasAccess ? (
        <div className="flex min-h-screen">
          {isMobileSidebarOpen ? (
            <button
              type="button"
              aria-label="Close navigation menu"
              className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          ) : null}
          <Sidebar
            open={isSidebarOpen}
            setOpen={setIsSidebarOpen}
            mobileOpen={isMobileSidebarOpen}
            setMobileOpen={setIsMobileSidebarOpen}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onOpenMobileNav={() => setIsMobileSidebarOpen(true)} />
            <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
          </div>
        </div>
      ) : (
        <div className="grid min-h-screen place-content-center px-4">
          <div className="panel max-w-md rounded-xl p-6 text-center">
            <ShieldX className="mx-auto mb-3 text-[var(--color-danger)]" size={30} />
            <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
            <p className="mt-1 text-sm text-slate-600">
              CMS ini hanya untuk role admin atau superadmin.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                clearAuth();
                window.location.href = "/auth/login";
              }}
            >
              Back to Login
            </Button>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
