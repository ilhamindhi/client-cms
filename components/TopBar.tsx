"use client";

import { Menu, ShieldCheck } from "lucide-react";
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

type TopBarProps = {
  onOpenMobileNav: () => void;
};

export default function TopBar({ onOpenMobileNav }: TopBarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = TITLE_MAP[pathname] || "CMS Portal";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex size-9 items-center justify-center rounded-md border border-[var(--color-border)] text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">{title}</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Manajemen backend untuk admin dan superadmin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {(user?.roles || []).map((role) => (
              <Badge key={role} variant={role === "superadmin" ? "warning" : "info"}>
                {role}
              </Badge>
            ))}
          </div>
          <span
            className="grid size-9 place-content-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
            aria-hidden="true"
          >
            <ShieldCheck size={18} />
          </span>
        </div>
      </div>
    </header>
  );
}
