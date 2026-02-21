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
  const { hasRole, clearAuth } = useAuthStore();

  const hasAccess = hasRole("admin") || hasRole("superadmin");

  return (
    <AuthGuard>
      {hasAccess ? (
        <div className="flex min-h-screen">
          <Sidebar open={isSidebarOpen} setOpen={setIsSidebarOpen} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 px-6 py-6">{children}</main>
          </div>
        </div>
      ) : (
        <div className="grid min-h-screen place-content-center px-4">
          <div className="panel max-w-md rounded-xl p-6 text-center">
            <ShieldX className="mx-auto mb-3 text-red-600" size={30} />
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
