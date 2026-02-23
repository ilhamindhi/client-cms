"use client";

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Download,
  Gift,
  ShieldAlert,
  RefreshCw,
  Shield,
  ShoppingCart,
  TicketPercent,
  Utensils,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { getAdminAnalyticsSummary, getAdminAnalyticsTimeseries, getOpsAlerts } from "@/lib/api/admin";
import { API_BASE_URL } from "@/lib/http";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AdminAnalyticsSummary, AdminAnalyticsTimeseriesPoint, OpsAlerts } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("id-ID");
const compactCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "short",
  day: "2-digit",
});

const quickLinks = [
  {
    title: "Admin Management",
    description: "Kelola akun admin dan lifecycle user operasional.",
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
    description: "Kelola plan membership dan coupon diskon premium.",
    href: "/memberships",
    icon: TicketPercent,
  },
  {
    title: "Gift Codes",
    description: "Kelola campaign gift code random points/membership.",
    href: "/gift-codes",
    icon: Gift,
  },
  {
    title: "Orders",
    description: "Pantau order, ubah status, buat shipment, dan refund.",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Payments",
    description: "Kelola payment methods, reconcile, dan retry webhook.",
    href: "/payments",
    icon: Wallet,
  },
  {
    title: "Nutrition",
    description: "Kelola food catalog dan verifikasi data nutrisi.",
    href: "/nutrition",
    icon: Utensils,
  },
  {
    title: "Ops Monitoring",
    description: "Readiness check dan ops summary detail.",
    href: "/ops",
    icon: Activity,
  },
];

function formatCompactCurrency(value: number) {
  return `Rp ${compactCurrencyFormatter.format(Number.isFinite(value) ? value : 0)}`;
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return shortDateFormatter.format(date);
}

function escapeCsvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) {
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(",")),
  ];
  const csvContent = lines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function safeInt(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function parseOptionalThreshold(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return safeInt(normalized);
}

function normalizeCsvValue(value: unknown): string | number | null | undefined {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toCsvRowsWithCategory(category: string, records: Array<Record<string, unknown>>) {
  if (records.length === 0) {
    return [] as Array<Record<string, string | number | null | undefined>>;
  }

  const headers = Array.from(
    new Set(records.flatMap((record) => Object.keys(record)))
  );

  return records.map((record) => {
    const row: Record<string, string | number | null | undefined> = {
      category,
    };
    for (const header of headers) {
      row[header] = normalizeCsvValue(record[header]);
    }
    return row;
  });
}

type MetricCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: ComponentType<{ size?: number }>;
};

type AlertThresholdPayload = {
  max_dead_letter?: number;
  max_failed_push?: number;
  max_stale_pending_payments?: number;
};

function MetricCard({ title, value, hint, icon: Icon }: MetricCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="grid size-10 place-content-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon size={20} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { user, hasRole, accessToken } = useAuthStore();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [autoRefreshSec, setAutoRefreshSec] = useState<0 | 30 | 60 | 120>(0);
  const [loading, setLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [timeseries, setTimeseries] = useState<AdminAnalyticsTimeseriesPoint[]>([]);
  const [opsAlerts, setOpsAlerts] = useState<OpsAlerts | null>(null);
  const [activeAlertThresholds, setActiveAlertThresholds] = useState<AlertThresholdPayload | null>(null);
  const [alertThresholds, setAlertThresholds] = useState({
    max_dead_letter: "",
    max_failed_push: "",
    max_stale_pending_payments: "",
  });
  const refreshInFlightRef = useRef(false);

  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");
  const isSuperadmin = hasRole("superadmin");

  async function loadAnalytics(
    nextDays = days,
    options?: {
      showLoading?: boolean;
    }
  ) {
    if (!accessToken || !hasAdminAccess) {
      return;
    }

    const shouldShowLoading = options?.showLoading ?? true;
    if (shouldShowLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const [summaryData, timeseriesData] = await Promise.all([
        getAdminAnalyticsSummary(accessToken, nextDays),
        getAdminAnalyticsTimeseries(accessToken, nextDays),
      ]);
      setSummary(summaryData);
      setTimeseries(timeseriesData.points);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load analytics");
    } finally {
      if (shouldShowLoading) {
        setLoading(false);
      }
    }
  }

  async function loadAlerts(
    options?: {
      showLoading?: boolean;
      useDraftThresholds?: boolean;
      syncThresholdInputs?: boolean;
    }
  ) {
    if (!accessToken || !isSuperadmin) {
      return;
    }

    const shouldShowLoading = options?.showLoading ?? true;
    const shouldUseDraftThresholds = options?.useDraftThresholds ?? false;
    const shouldSyncThresholdInputs = options?.syncThresholdInputs ?? false;
    const thresholdsPayload: AlertThresholdPayload = shouldUseDraftThresholds
      ? {
          max_dead_letter: parseOptionalThreshold(alertThresholds.max_dead_letter),
          max_failed_push: parseOptionalThreshold(alertThresholds.max_failed_push),
          max_stale_pending_payments: parseOptionalThreshold(alertThresholds.max_stale_pending_payments),
        }
      : activeAlertThresholds ?? {};

    if (shouldShowLoading) {
      setAlertsLoading(true);
    }
    try {
      const data = await getOpsAlerts(accessToken, {
        limit: 10,
        ...thresholdsPayload,
      });
      setOpsAlerts(data);
      setActiveAlertThresholds({
        max_dead_letter: data.thresholds.dead_letter_webhooks,
        max_failed_push: data.thresholds.failed_push_notifications,
        max_stale_pending_payments: data.thresholds.stale_pending_payments,
      });
      if (shouldSyncThresholdInputs || activeAlertThresholds === null) {
        setAlertThresholds({
          max_dead_letter: String(data.thresholds.dead_letter_webhooks),
          max_failed_push: String(data.thresholds.failed_push_notifications),
          max_stale_pending_payments: String(data.thresholds.stale_pending_payments),
        });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load ops alerts");
    } finally {
      if (shouldShowLoading) {
        setAlertsLoading(false);
      }
    }
  }

  async function refreshAll(
    options?: {
      showLoading?: boolean;
      syncThresholdInputs?: boolean;
      useDraftThresholds?: boolean;
    }
  ) {
    if (!accessToken || !hasAdminAccess) {
      return;
    }
    if (refreshInFlightRef.current) {
      return;
    }
    refreshInFlightRef.current = true;

    try {
      const tasks = [loadAnalytics(days, { showLoading: options?.showLoading })];
      if (isSuperadmin) {
        tasks.push(
          loadAlerts({
            showLoading: options?.showLoading,
            syncThresholdInputs: options?.syncThresholdInputs,
            useDraftThresholds: options?.useDraftThresholds,
          })
        );
      }
      await Promise.all(tasks);
      setLastRefreshedAt(new Date().toISOString());
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  function exportAnalyticsCsv() {
    if (!summary || chartRows.length === 0) {
      return;
    }
    const summaryRows = [
      { metric: "period_days", value: summary.period_days },
      { metric: "total_users", value: summary.total_users },
      { metric: "new_users_period", value: summary.new_users_period },
      { metric: "active_memberships", value: summary.active_memberships },
      { metric: "pending_memberships", value: summary.pending_memberships },
      { metric: "paid_orders_period", value: summary.paid_orders_period },
      { metric: "paid_gmv_period", value: summary.paid_gmv_period },
      { metric: "pending_payments", value: summary.pending_payments },
      { metric: "active_challenge_participations", value: summary.active_challenge_participations },
      { metric: "gift_redemptions_period", value: summary.gift_redemptions_period },
      { metric: "points_issued_period", value: summary.points_issued_period },
      { metric: "points_spent_period", value: summary.points_spent_period },
    ];
    const timeseriesRows = chartRows.map((row) => ({
      date: row.date,
      new_users: row.new_users,
      paid_orders: row.paid_orders,
      paid_gmv: row.paid_gmv,
      gift_redemptions: row.gift_redemptions,
      points_issued: row.points_issued,
      points_spent: row.points_spent,
      memberships_created: row.memberships_created,
      memberships_canceled: row.memberships_canceled,
    }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCsv(`analytics-summary-${days}d-${timestamp}.csv`, summaryRows);
    downloadCsv(`analytics-timeseries-${days}d-${timestamp}.csv`, timeseriesRows);
  }

  function exportOpsAlertsCsv() {
    if (!opsAlerts) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const summaryRows = [
      { metric: "ok", value: opsAlerts.ok ? "true" : "false" },
      { metric: "severity", value: opsAlerts.severity },
      { metric: "dead_letter_webhooks", value: opsAlerts.counters.dead_letter_webhooks },
      { metric: "failed_push_notifications", value: opsAlerts.counters.failed_push_notifications },
      { metric: "stale_pending_payments", value: opsAlerts.counters.stale_pending_payments },
      { metric: "threshold_dead_letter_webhooks", value: opsAlerts.thresholds.dead_letter_webhooks },
      {
        metric: "threshold_failed_push_notifications",
        value: opsAlerts.thresholds.failed_push_notifications,
      },
      {
        metric: "threshold_stale_pending_payments",
        value: opsAlerts.thresholds.stale_pending_payments,
      },
    ];

    const breachRows = opsAlerts.breaches.map((entry) => ({
      key: entry.key,
      value: entry.value,
      threshold: entry.threshold,
      exceeded_by: entry.value - entry.threshold,
    }));

    const detailRows = [
      ...toCsvRowsWithCategory("dead_letter_webhooks", opsAlerts.dead_letter_webhooks),
      ...toCsvRowsWithCategory("failed_push_notifications", opsAlerts.failed_push_notifications),
      ...toCsvRowsWithCategory("stale_pending_payments", opsAlerts.stale_pending_payments),
    ];

    downloadCsv(`ops-alerts-summary-${timestamp}.csv`, summaryRows);
    if (breachRows.length > 0) {
      downloadCsv(`ops-alerts-breaches-${timestamp}.csv`, breachRows);
    }
    if (detailRows.length > 0) {
      downloadCsv(`ops-alerts-details-${timestamp}.csv`, detailRows);
    }
  }

  useEffect(() => {
    void refreshAll({
      showLoading: true,
      syncThresholdInputs: true,
      useDraftThresholds: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess, isSuperadmin, days]);

  useEffect(() => {
    if (autoRefreshSec === 0 || !accessToken || !hasAdminAccess) {
      return;
    }

    const timer = setInterval(() => {
      void refreshAll({
        showLoading: false,
        syncThresholdInputs: false,
        useDraftThresholds: false,
      });
    }, autoRefreshSec * 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshSec, accessToken, hasAdminAccess, isSuperadmin, days]);

  const chartRows = useMemo(
    () =>
      timeseries.map((entry) => ({
        ...entry,
        label: formatShortDate(entry.date),
      })),
    [timeseries]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Ringkasan performa operasional backend untuk admin/superadmin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">API: {API_BASE_URL}</Badge>
            <Badge variant={autoRefreshSec > 0 ? "success" : "default"}>
              auto-refresh: {autoRefreshSec > 0 ? `${autoRefreshSec}s` : "off"}
            </Badge>
            {(user?.roles || []).map((role) => (
              <Badge key={role} variant={role === "superadmin" ? "warning" : "default"}>
                {role}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Login saat ini: <span className="font-semibold text-slate-900">{user?.email || "-"}</span>
              {lastRefreshedAt ? (
                <span className="ml-2 text-slate-500">| last refresh: {formatDateTime(lastRefreshedAt)}</span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={days}
                onChange={(event) => setDays(Number(event.target.value) as 7 | 30 | 90)}
              >
                <option value={7}>7 hari</option>
                <option value={30}>30 hari</option>
                <option value={90}>90 hari</option>
              </select>
              <select
                className="h-10 rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                value={autoRefreshSec}
                onChange={(event) =>
                  setAutoRefreshSec(Number(event.target.value) as 0 | 30 | 60 | 120)
                }
              >
                <option value={0}>Auto refresh: Off</option>
                <option value={30}>Auto refresh: 30s</option>
                <option value={60}>Auto refresh: 60s</option>
                <option value={120}>Auto refresh: 120s</option>
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void refreshAll({
                    showLoading: true,
                    syncThresholdInputs: false,
                    useDraftThresholds: false,
                  });
                }}
                isLoading={loading}
                leftIcon={<RefreshCw size={16} />}
              >
                Refresh
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={exportAnalyticsCsv}
                leftIcon={<Download size={16} />}
                disabled={!summary || chartRows.length === 0}
              >
                Export CSV
              </Button>
            </div>
          </div>
          {error ? <Alert variant="error">{error}</Alert> : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && !summary ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card key={`metric-skeleton-${index}`}>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))
        ) : summary ? (
          <>
            <MetricCard
              title="Total Users"
              value={numberFormatter.format(summary.total_users)}
              hint={`+${numberFormatter.format(summary.new_users_period)} user baru`}
              icon={Users}
            />
            <MetricCard
              title="Paid Orders"
              value={numberFormatter.format(summary.paid_orders_period)}
              hint={`${days} hari terakhir`}
              icon={ShoppingCart}
            />
            <MetricCard
              title="Paid GMV"
              value={formatCompactCurrency(summary.paid_gmv_period)}
              hint={`${days} hari terakhir`}
              icon={Wallet}
            />
            <MetricCard
              title="Active Memberships"
              value={numberFormatter.format(summary.active_memberships)}
              hint={`${numberFormatter.format(summary.pending_memberships)} pending`}
              icon={TicketPercent}
            />
            <MetricCard
              title="Gift Redemptions"
              value={numberFormatter.format(summary.gift_redemptions_period)}
              hint={`${days} hari terakhir`}
              icon={Gift}
            />
            <MetricCard
              title="Points Issued/Spent"
              value={`${numberFormatter.format(summary.points_issued_period)} / ${numberFormatter.format(summary.points_spent_period)}`}
              hint={`${days} hari terakhir`}
              icon={Activity}
            />
            <MetricCard
              title="Pending Payments"
              value={numberFormatter.format(summary.pending_payments)}
              hint="Perlu monitoring webhook/reconcile"
              icon={Wallet}
            />
            <MetricCard
              title="Challenge Active"
              value={numberFormatter.format(summary.active_challenge_participations)}
              hint="Partisipasi ongoing"
              icon={Activity}
            />
          </>
        ) : null}
      </div>

      {isSuperadmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert size={18} />
              Ops Alerts Threshold
            </CardTitle>
            <CardDescription>
              Threshold ini dipakai untuk mendeteksi breach operasional (dead-letter webhook, push failed, stale pending payment).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <Input
                label="Max Dead Letter"
                type="number"
                min="0"
                value={alertThresholds.max_dead_letter}
                onChange={(event) =>
                  setAlertThresholds((prev) => ({
                    ...prev,
                    max_dead_letter: event.target.value,
                  }))
                }
              />
              <Input
                label="Max Failed Push"
                type="number"
                min="0"
                value={alertThresholds.max_failed_push}
                onChange={(event) =>
                  setAlertThresholds((prev) => ({
                    ...prev,
                    max_failed_push: event.target.value,
                  }))
                }
              />
              <Input
                label="Max Stale Pending"
                type="number"
                min="0"
                value={alertThresholds.max_stale_pending_payments}
                onChange={(event) =>
                  setAlertThresholds((prev) => ({
                    ...prev,
                    max_stale_pending_payments: event.target.value,
                  }))
                }
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  isLoading={alertsLoading}
                  onClick={() => {
                    void loadAlerts({
                      showLoading: true,
                      useDraftThresholds: true,
                      syncThresholdInputs: true,
                    });
                  }}
                >
                  Apply Threshold
                </Button>
              </div>
            </div>

            {opsAlerts ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      opsAlerts.severity === "high"
                        ? "danger"
                        : opsAlerts.severity === "medium"
                          ? "warning"
                          : "success"
                    }
                  >
                    Severity: {opsAlerts.severity}
                  </Badge>
                  <Badge variant={opsAlerts.ok ? "success" : "danger"}>
                    {opsAlerts.ok ? "No Breach" : "Breach Detected"}
                  </Badge>
                  <Badge variant="default">
                    dead-letter: {numberFormatter.format(opsAlerts.counters.dead_letter_webhooks)}
                  </Badge>
                  <Badge variant="default">
                    failed-push: {numberFormatter.format(opsAlerts.counters.failed_push_notifications)}
                  </Badge>
                  <Badge variant="default">
                    stale-pending: {numberFormatter.format(opsAlerts.counters.stale_pending_payments)}
                  </Badge>
                </div>

                {opsAlerts.breaches.length > 0 ? (
                  <Alert variant="error">
                    Breach:{" "}
                    {opsAlerts.breaches
                      .map((entry) => `${entry.key} (${entry.value} > ${entry.threshold})`)
                      .join(", ")}
                  </Alert>
                ) : (
                  <Alert variant="success">Semua counter masih di bawah threshold.</Alert>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<Download size={16} />}
                    onClick={exportOpsAlertsCsv}
                  >
                    Export Ops CSV
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User & Membership Trend</CardTitle>
            <CardDescription>User baru vs membership dibuat/batal per hari.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && chartRows.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="new_users" stroke="#0f766e" strokeWidth={2} />
                  <Line type="monotone" dataKey="memberships_created" stroke="#1d4ed8" strokeWidth={2} />
                  <Line type="monotone" dataKey="memberships_canceled" stroke="#b91c1c" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders & Gift Redemption</CardTitle>
            <CardDescription>Paid orders dan gift redemption harian.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && chartRows.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="paid_orders" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gift_redemptions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GMV Trend</CardTitle>
            <CardDescription>Nilai transaksi paid orders per hari.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && chartRows.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={(value) => compactCurrencyFormatter.format(Number(value))} />
                  <Tooltip formatter={(value) => formatCompactCurrency(Number(value))} />
                  <Line type="monotone" dataKey="paid_gmv" stroke="#ea580c" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Points Flow</CardTitle>
            <CardDescription>Distribusi points issued vs spent per hari.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loading && chartRows.length === 0 ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="points_issued" stackId="1" stroke="#059669" fill="#10b981" />
                  <Area type="monotone" dataKey="points_spent" stackId="2" stroke="#dc2626" fill="#ef4444" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quickLinks.map((entry) => {
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
    </div>
  );
}
