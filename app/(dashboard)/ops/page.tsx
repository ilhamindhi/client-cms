"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, ShieldAlert } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { getOpsAlerts } from "@/lib/api/admin";
import { getOpsReadiness, getOpsSummary } from "@/lib/api/ops";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { OpsAlerts, OpsReadiness, OpsSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : undefined;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function RecordRowsTable({
  title,
  rows,
  emptyDescription,
}: {
  title: string;
  rows: Array<Record<string, unknown>>;
  emptyDescription: string;
}) {
  const headers = useMemo(() => {
    if (rows.length === 0) return [] as string[];
    return Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No data" description={emptyDescription} />
        ) : (
          <Table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <TableHead key={`${title}-${header}`}>{header}</TableHead>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <TableRow key={`${title}-row-${index}`}>
                  {headers.map((header) => (
                    <TableCell key={`${title}-row-${index}-${header}`}>{formatValue(row[header])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function OpsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");
  const isSuperadmin = hasRole("superadmin");

  const [lookbackHours, setLookbackHours] = useState("24");
  const [alertsLimit, setAlertsLimit] = useState("50");
  const [maxDeadLetter, setMaxDeadLetter] = useState("");
  const [maxFailedPush, setMaxFailedPush] = useState("");
  const [maxStalePending, setMaxStalePending] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<OpsReadiness | null>(null);
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [alerts, setAlerts] = useState<OpsAlerts | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Ops",
    successTitle: "Ops",
  });

  async function loadOps(options?: { useCustomThresholds?: boolean }) {
    if (!hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    setPageMessage(null);
    try {
      const readinessPromise = getOpsReadiness();
      const summaryPromise = accessToken
        ? getOpsSummary(accessToken, Math.max(1, Math.floor(toNumber(lookbackHours, 24))))
        : Promise.resolve(null);
      const alertsPromise =
        isSuperadmin && accessToken
          ? getOpsAlerts(accessToken, {
              limit: Math.max(1, Math.min(200, Math.floor(toNumber(alertsLimit, 50)))),
              ...(options?.useCustomThresholds
                ? {
                    max_dead_letter: toOptionalNumber(maxDeadLetter),
                    max_failed_push: toOptionalNumber(maxFailedPush),
                    max_stale_pending_payments: toOptionalNumber(maxStalePending),
                  }
                : {}),
            })
          : Promise.resolve(null);

      const [readinessData, summaryData, alertsData] = await Promise.all([
        readinessPromise,
        summaryPromise,
        alertsPromise,
      ]);

      setReadiness(readinessData);
      setSummary(summaryData);
      setAlerts(alertsData);
      setLastLoadedAt(new Date().toISOString());
      setPageMessage("Ops data loaded.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load ops data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess, isSuperadmin]);

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={<Activity size={28} />}
        title="Admin only"
        description="Halaman ops untuk admin/superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ops Monitoring</CardTitle>
          <CardDescription>
            Monitoring readiness, summary metrics, dan alert operasional backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Input
              label="Lookback Hours"
              type="number"
              min="1"
              value={lookbackHours}
              onChange={(event) => setLookbackHours(event.target.value)}
            />
            {isSuperadmin ? (
              <Input
                label="Alerts Limit"
                type="number"
                min="1"
                max="200"
                value={alertsLimit}
                onChange={(event) => setAlertsLimit(event.target.value)}
              />
            ) : (
              <div />
            )}
            <div className="flex items-end gap-2 lg:col-span-2">
              <Button
                type="button"
                variant="outline"
                leftIcon={<RefreshCw size={16} />}
                onClick={() => void loadOps()}
                isLoading={loading}
              >
                Refresh
              </Button>
              {lastLoadedAt ? (
                <span className="text-xs text-slate-500">Last loaded: {formatDateTime(lastLoadedAt)}</span>
              ) : null}
            </div>
          </div>

          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-slate-500">Status</span>
              <div className="mt-1">
                <Badge variant={readiness?.status === "ready" ? "success" : "danger"}>
                  {readiness?.status ?? "not_loaded"}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-slate-500">DB Now</span>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {readiness?.db_now ? formatDateTime(readiness.db_now) : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users & Memberships</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-700">Total users: <span className="font-semibold">{summary?.users.total ?? 0}</span></p>
            <p className="text-slate-700">Active users: <span className="font-semibold">{summary?.users.active ?? 0}</span></p>
            <p className="text-slate-700">Active memberships: <span className="font-semibold">{summary?.memberships.active ?? 0}</span></p>
            <p className="text-slate-700">Pending memberships: <span className="font-semibold">{summary?.memberships.pending_payment ?? 0}</span></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders & Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-slate-700">Paid orders: <span className="font-semibold">{summary?.orders.paid_count ?? 0}</span></p>
            <p className="text-slate-700">Paid GMV: <span className="font-semibold">{summary?.orders.paid_gmv ?? 0}</span></p>
            <p className="text-slate-700">Pending payments: <span className="font-semibold">{summary?.payments.pending ?? 0}</span></p>
            <p className="text-slate-700">Overdue pending: <span className="font-semibold">{summary?.payments.overdue_pending ?? 0}</span></p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Health</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p className="text-slate-700">
            Webhook dead-letters: <span className="font-semibold">{summary?.payments.webhook_dead_letters ?? 0}</span>
          </p>
          <p className="text-slate-700">
            Webhook failures (lookback):{" "}
            <span className="font-semibold">{summary?.payments.webhook_failures_lookback ?? 0}</span>
          </p>
          <p className="text-slate-700">
            Push failures (lookback):{" "}
            <span className="font-semibold">{summary?.notifications.push_failures_lookback ?? 0}</span>
          </p>
          <p className="text-slate-700">
            Push pending: <span className="font-semibold">{summary?.notifications.push_pending ?? 0}</span>
          </p>
        </CardContent>
      </Card>

      {isSuperadmin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert size={18} />
                Ops Alerts
              </CardTitle>
              <CardDescription>Threshold dan detail breach untuk superadmin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <Input
                  label="Max Dead Letter"
                  type="number"
                  min="0"
                  value={maxDeadLetter}
                  onChange={(event) => setMaxDeadLetter(event.target.value)}
                />
                <Input
                  label="Max Failed Push"
                  type="number"
                  min="0"
                  value={maxFailedPush}
                  onChange={(event) => setMaxFailedPush(event.target.value)}
                />
                <Input
                  label="Max Stale Pending"
                  type="number"
                  min="0"
                  value={maxStalePending}
                  onChange={(event) => setMaxStalePending(event.target.value)}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => void loadOps({ useCustomThresholds: true })}
                    isLoading={loading}
                  >
                    Apply Threshold
                  </Button>
                </div>
              </div>

              {alerts ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        alerts.severity === "high"
                          ? "danger"
                          : alerts.severity === "medium"
                            ? "warning"
                            : "success"
                      }
                    >
                      severity: {alerts.severity}
                    </Badge>
                    <Badge variant={alerts.ok ? "success" : "danger"}>
                      {alerts.ok ? "no breach" : "breach detected"}
                    </Badge>
                  </div>

                  {alerts.breaches.length > 0 ? (
                    <Alert variant="error">
                      {alerts.breaches.map((item) => `${item.key} (${item.value} > ${item.threshold})`).join(", ")}
                    </Alert>
                  ) : (
                    <Alert variant="success">Semua counter masih di bawah threshold.</Alert>
                  )}

                  <Table>
                    <thead>
                      <tr>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Threshold</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      <TableRow>
                        <TableCell>dead_letter_webhooks</TableCell>
                        <TableCell>{alerts.counters.dead_letter_webhooks}</TableCell>
                        <TableCell>{alerts.thresholds.dead_letter_webhooks}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>failed_push_notifications</TableCell>
                        <TableCell>{alerts.counters.failed_push_notifications}</TableCell>
                        <TableCell>{alerts.thresholds.failed_push_notifications}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>stale_pending_payments</TableCell>
                        <TableCell>{alerts.counters.stale_pending_payments}</TableCell>
                        <TableCell>{alerts.thresholds.stale_pending_payments}</TableCell>
                      </TableRow>
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState title="No alerts data" description="Klik Refresh atau Apply Threshold." />
              )}
            </CardContent>
          </Card>

          {alerts ? (
            <div className="grid grid-cols-1 gap-4">
              <RecordRowsTable
                title="Dead Letter Webhooks"
                rows={alerts.dead_letter_webhooks}
                emptyDescription="Belum ada dead-letter webhook."
              />
              <RecordRowsTable
                title="Failed Push Notifications"
                rows={alerts.failed_push_notifications}
                emptyDescription="Belum ada push notification failed."
              />
              <RecordRowsTable
                title="Stale Pending Payments"
                rows={alerts.stale_pending_payments}
                emptyDescription="Belum ada stale pending payments."
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
