"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Search, ShieldX } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { listAuditLogs } from "@/lib/api/admin";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AuditLog } from "@/lib/types";
import { formatDateTime, maskText } from "@/lib/utils";

const RISKY_ACTION_EXACT = new Set<string>([
  "auth.user.roles.update",
  "auth.user.status.update",
  "auth.user.force_logout",
  "auth.user.password.reset",
  "products.archive",
  "products.stock.adjust",
  "orders.refund.create",
  "orders.status.update",
  "orders.shipments.update",
  "orders.coupons.disable",
  "membership.plans.disable",
  "membership.coupons.disable",
  "points.rewards.disable",
  "points.redemptions.update",
  "referrals.payouts.update",
  "media.delete",
  "notifications.templates.disable",
]);

const RISKY_ACTION_KEYWORDS = [
  "archive",
  "disable",
  "delete",
  "refund",
  "force_logout",
  "password.reset",
  "roles.update",
  "status.update",
];

function isRiskyAction(action: string) {
  if (RISKY_ACTION_EXACT.has(action)) {
    return true;
  }
  return RISKY_ACTION_KEYWORDS.some((keyword) => action.includes(keyword));
}

function toCsvCell(value: unknown) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export default function AuditLogsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [showRiskyOnly, setShowRiskyOnly] = useState(false);
  const isInitialLoading = isLoading && logs.length === 0;

  async function fetchLogs() {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listAuditLogs(accessToken, {
        limit: 200,
        action: action.trim() || undefined,
        actor_user_id: actorId.trim() || undefined,
      });
      setLogs(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to fetch audit logs");
    } finally {
      setIsLoading(false);
    }
  }

  const visibleLogs = useMemo(() => {
    if (!showRiskyOnly) {
      return logs;
    }
    return logs.filter((entry) => isRiskyAction(entry.action));
  }, [logs, showRiskyOnly]);

  function exportVisibleLogsCsv() {
    if (visibleLogs.length === 0) {
      return;
    }

    const headers = [
      "id",
      "action",
      "actor_email",
      "actor_roles",
      "target_email",
      "resource_type",
      "resource_id",
      "request_id",
      "ip_address",
      "created_at",
      "payload_json",
    ];

    const rows = visibleLogs.map((entry) => [
      entry.id,
      entry.action,
      entry.actor_email ?? "",
      (entry.actor_roles ?? []).join("|"),
      entry.target_email ?? "",
      entry.resource_type,
      entry.resource_id ?? "",
      entry.request_id ?? "",
      entry.ip_address ?? "",
      entry.created_at,
      entry.payload_json ? JSON.stringify(entry.payload_json) : "",
    ]);

    const csv = [headers.map(toCsvCell).join(","), ...rows.map((row) => row.map(toCsvCell).join(","))].join("\n");
    const fileName = `audit-logs-${showRiskyOnly ? "risky" : "all"}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  useEffect(() => {
    if (hasRole("superadmin")) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasRole]);

  if (!hasRole("superadmin")) {
    return (
      <EmptyState
        icon={<ShieldX size={28} />}
        title="Superadmin only"
        description="Halaman audit log hanya dapat diakses oleh role superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Menampilkan semua aksi penting: create/promote admin, perubahan status, dan event sensitif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy={isLoading}>
          <form
            className="grid grid-cols-1 gap-3 lg:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchLogs();
            }}
          >
            <Input
              label="Action"
              value={action}
              placeholder="auth.admin.created"
              onChange={(event) => setAction(event.target.value)}
              aria-label="Filter by action"
            />
            <Input
              label="Actor User ID"
              value={actorId}
              placeholder="uuid actor"
              onChange={(event) => setActorId(event.target.value)}
              aria-label="Filter by actor user id"
            />
            <div className="flex items-end gap-2">
              <Button variant="outline" className="w-full" type="submit" isLoading={isLoading}>
                <Search size={16} />
                Filter
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={showRiskyOnly ? "primary" : "outline"}
              onClick={() => setShowRiskyOnly((value) => !value)}
            >
              <AlertTriangle size={14} />
              {showRiskyOnly ? "Risky only aktif" : "Tampilkan risky actions"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={fetchLogs} isLoading={isLoading}>
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportVisibleLogsCsv}
              disabled={visibleLogs.length === 0}
            >
              <Download size={14} />
              Export CSV ({visibleLogs.length})
            </Button>
          </div>

          {error ? <Alert variant="error">{error}</Alert> : null}

          {isInitialLoading ? (
            <Table aria-label="Loading audit logs">
              <thead>
                <tr>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Created At</TableHead>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={`audit-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : !isLoading && visibleLogs.length === 0 ? (
            <EmptyState title="Audit log kosong" description="Belum ada event yang cocok dengan filter saat ini." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Created At</TableHead>
                </tr>
              </thead>
              <tbody>
                {visibleLogs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{entry.action}</div>
                      <div className="text-xs text-slate-500">{maskText(entry.id, 16)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{entry.actor_email || "-"}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(entry.actor_roles || []).map((role) => (
                          <Badge key={`${entry.id}-${role}`} variant={role === "superadmin" ? "warning" : "info"}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{entry.target_email || "-"}</TableCell>
                    <TableCell>
                      <div>{entry.resource_type}</div>
                      <div className="text-xs text-slate-500">{entry.resource_id || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600">{entry.request_id || "-"}</div>
                      <div className="text-xs text-slate-500">{entry.ip_address || "-"}</div>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
