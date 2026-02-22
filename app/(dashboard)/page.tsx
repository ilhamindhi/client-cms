"use client";

import Link from "next/link";
import { Activity, Gift, Shield, TicketPercent, Users } from "lucide-react";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { API_BASE_URL } from "@/lib/http";
import { useAuthStore } from "@/lib/stores/auth-store";

const cards = [
  {
    title: "Admin Management",
    description: "Kelola akun admin dan promosi role oleh superadmin.",
    href: "/admins",
    icon: Users,
  },
  {
    title: "Audit Logs",
    description: "Pantau semua perubahan penting dari admin/superadmin.",
    href: "/audit-logs",
    icon: Shield,
  },
  {
    title: "Membership Coupons",
    description: "Pantau integrasi kupon diskon membership premium.",
    href: "/memberships",
    icon: TicketPercent,
  },
  {
    title: "Gift Codes",
    description: "Monitoring gift code random points & membership gift.",
    href: "/gift-codes",
    icon: Gift,
  },
];

export default function DashboardHomePage() {
  const { user, hasRole } = useAuthStore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan CMS</CardTitle>
          <CardDescription>Baseline UI/UX mengikuti gaya JAM Services (sidebar, table-centric, panel clean).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">API: {API_BASE_URL}</Badge>
            {(user?.roles || []).map((role) => (
              <Badge key={role} variant={role === "superadmin" ? "warning" : "default"}>
                {role}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Login saat ini: <span className="font-semibold text-slate-900">{user?.email || "-"}</span>
          </p>
          <p className="text-sm text-slate-600">
            Capability:{" "}
            {hasRole("superadmin")
              ? "Full superadmin access (create admin + audit logs)."
              : "Admin access (monitoring & operasional)."}{" "}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((entry) => {
          const Icon = entry.icon;
          const isAudit = entry.href === "/audit-logs";
          const isRestricted = isAudit && !hasRole("superadmin");

          const content = (
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex items-start gap-3">
                <span className="mt-0.5 grid size-10 shrink-0 place-content-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{entry.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{entry.description}</p>
                  {isRestricted ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]">
                      Superadmin only
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );

          if (isRestricted) {
            return (
              <div key={entry.href} className="opacity-60" aria-disabled="true">
                {content}
              </div>
            );
          }

          return (
            <Link key={entry.href} href={entry.href}>
              {content}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={18} />
            Integrasi Backend Ready
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          <ul className="list-disc space-y-1 pl-5">
            <li>`/auth/login`, `/auth/refresh`, `/auth/me`, `/auth/logout`</li>
            <li>`/auth/admin/users` untuk list admin/user internal</li>
            <li>`/auth/superadmin/admin-users` untuk create/promote admin</li>
            <li>`/auth/superadmin/audit-logs` untuk monitoring perubahan</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
