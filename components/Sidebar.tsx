"use client";

import { motion } from "framer-motion";
import {
  ChevronsRight,
  Gift,
  LayoutDashboard,
  LogOut,
  Shield,
  TicketPercent,
  UserCog,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, Dispatch, SetStateAction } from "react";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn, getInitials } from "@/lib/utils";

type SidebarProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
  requiredRole?: "admin" | "superadmin";
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Admin Users", href: "/admins", icon: UserCog, requiredRole: "admin" },
  { label: "Audit Logs", href: "/audit-logs", icon: Shield, requiredRole: "superadmin" },
  { label: "Membership Coupons", href: "/memberships", icon: TicketPercent },
  { label: "Gift Codes", href: "/gift-codes", icon: Gift },
];

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole, accessToken, refreshToken, clearAuth } = useAuthStore();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredRole) {
      return true;
    }
    if (item.requiredRole === "admin") {
      return hasRole("admin") || hasRole("superadmin");
    }
    return hasRole("superadmin");
  });

  async function handleLogout() {
    try {
      if (accessToken) {
        await logout(accessToken, refreshToken);
      }
    } catch {
      // ignore logout API error on frontend
    } finally {
      clearAuth();
      router.replace("/auth/login");
    }
  }

  return (
    <motion.aside
      layout
      className="sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-[var(--color-border)] bg-white"
      style={{ width: open ? 270 : 80 }}
    >
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-3">
        <div className="grid size-10 place-content-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Shield size={20} />
        </div>
        {open ? (
          <div className="ml-3">
            <p className="text-sm font-bold text-slate-900">CMS Portal</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isSelected = pathname === item.href;

          return (
            <button
              key={item.href}
              className={cn(
                "flex h-11 w-full items-center rounded-lg px-2 transition",
                isSelected
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-slate-600 hover:bg-slate-100",
              )}
              onClick={() => router.push(item.href)}
              type="button"
            >
              <span className="grid size-9 place-content-center">
                <Icon size={20} />
              </span>
              {open ? <span className="text-sm font-semibold">{item.label}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="border-t border-[var(--color-border)] p-2">
        <div className={cn("mb-2 flex items-center rounded-lg bg-slate-50 p-2", open ? "" : "justify-center")}>
          <div className="grid size-9 place-content-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
            {getInitials(user?.display_name || user?.email)}
          </div>
          {open ? (
            <div className="ml-2 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.display_name || user?.email || "Admin"}
              </p>
              <p className="truncate text-xs uppercase tracking-wide text-slate-500">
                {(user?.roles || []).join(", ") || "-"}
              </p>
            </div>
          ) : null}
        </div>

        <button
          className={cn(
            "flex h-11 w-full items-center rounded-lg px-2 text-slate-600 transition hover:bg-slate-100",
            open ? "" : "justify-center",
          )}
          onClick={handleLogout}
          type="button"
        >
          <span className="grid size-9 place-content-center">
            <LogOut size={20} />
          </span>
          {open ? <span className="text-sm font-semibold">Logout</span> : null}
        </button>

        <button
          className={cn(
            "mt-1 flex h-11 w-full items-center rounded-lg px-2 text-slate-600 transition hover:bg-slate-100",
            open ? "" : "justify-center",
          )}
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="grid size-9 place-content-center">
            <ChevronsRight className={cn("transition", open ? "rotate-180" : "")} size={20} />
          </span>
          {open ? <span className="text-sm font-semibold">Collapse</span> : null}
        </button>
      </div>
    </motion.aside>
  );
}
