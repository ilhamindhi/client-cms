"use client";

import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  Boxes,
  ChevronsRight,
  CreditCard,
  Gift,
  Flag,
  Image,
  LayoutDashboard,
  LogOut,
  Network,
  Shield,
  ShoppingCart,
  Activity,
  TicketPercent,
  Utensils,
  X,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType, Dispatch, SetStateAction } from "react";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn, getInitials } from "@/lib/utils";

type SidebarProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
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
  { label: "Products", href: "/products", icon: Boxes, requiredRole: "admin" },
  { label: "Orders", href: "/orders", icon: ShoppingCart, requiredRole: "admin" },
  { label: "Payments", href: "/payments", icon: CreditCard, requiredRole: "admin" },
  { label: "Rewards", href: "/rewards", icon: Gift, requiredRole: "admin" },
  { label: "Referrals", href: "/referrals", icon: Network, requiredRole: "admin" },
  { label: "Notifications & Broadcast", href: "/notifications", icon: Bell, requiredRole: "admin" },
  { label: "Challenges", href: "/challenges", icon: Flag, requiredRole: "admin" },
  { label: "Nutrition", href: "/nutrition", icon: Utensils, requiredRole: "admin" },
  { label: "Content", href: "/content", icon: BookOpen, requiredRole: "admin" },
  { label: "Media", href: "/media", icon: Image, requiredRole: "admin" },
  { label: "Ops", href: "/ops", icon: Activity, requiredRole: "admin" },
];

export default function Sidebar({ open, setOpen, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasRole, accessToken, refreshToken, clearAuth } = useAuthStore();
  const isExpanded = open || mobileOpen;
  const sidebarWidth = isExpanded ? 270 : 80;

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
      setMobileOpen(false);
      router.replace("/auth/login");
    }
  }

  return (
    <motion.aside
      layout
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--color-border)] bg-white shadow-xl transition-transform md:sticky md:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
      style={{ width: sidebarWidth }}
    >
      <div className="flex h-16 items-center border-b border-[var(--color-border)] px-3">
        <div className="grid size-10 place-content-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Shield size={20} />
        </div>
        {isExpanded ? (
          <div className="ml-3">
            <p className="text-sm font-bold text-slate-900">CMS Portal</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 md:hidden"
          aria-label="Close navigation menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Sidebar navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isSelected = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 w-full items-center rounded-lg px-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35",
                isSelected
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-slate-600 hover:bg-slate-100",
              )}
              onClick={() => setMobileOpen(false)}
              aria-current={isSelected ? "page" : undefined}
              title={!isExpanded ? item.label : undefined}
            >
              <span className="grid size-9 place-content-center">
                <Icon size={20} />
              </span>
              {isExpanded ? <span className="text-sm font-semibold">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-2">
        <div className={cn("mb-2 flex items-center rounded-lg bg-slate-50 p-2", isExpanded ? "" : "justify-center")}>
          <div className="grid size-9 place-content-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
            {getInitials(user?.display_name || user?.email)}
          </div>
          {isExpanded ? (
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
            "flex h-11 w-full items-center rounded-lg px-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35",
            isExpanded ? "" : "justify-center",
          )}
          onClick={handleLogout}
          type="button"
        >
          <span className="grid size-9 place-content-center">
            <LogOut size={20} />
          </span>
          {isExpanded ? <span className="text-sm font-semibold">Logout</span> : null}
        </button>

        <button
          className={cn(
            "mt-1 hidden h-11 w-full items-center rounded-lg px-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 md:flex",
            open ? "" : "justify-center",
          )}
          onClick={() => setOpen((value) => !value)}
          type="button"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
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
