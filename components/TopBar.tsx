"use client";

import { ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useAuthStore } from "@/lib/stores/auth-store";

const TITLE_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/admins": "Admin Users",
  "/audit-logs": "Audit Logs",
  "/memberships": "Membership Coupons",
  "/gift-codes": "Gift Codes",
};

export default function TopBar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = TITLE_MAP[pathname] || "CMS Portal";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">Manajemen backend untuk admin dan superadmin</p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.roles || []).map((role) => (
            <Badge key={role} variant={role === "superadmin" ? "warning" : "info"}>
              {role}
            </Badge>
          ))}
          <span className="grid size-9 place-content-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ShieldCheck size={18} />
          </span>
        </div>
      </div>
    </header>
  );
}
