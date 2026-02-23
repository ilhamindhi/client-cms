import { apiRequest } from "@/lib/http";
import type { AdminAnalyticsSummary, AdminAnalyticsTimeseries, AuditLog, OpsAlerts } from "@/lib/types";

type ListAuditLogsInput = {
  limit?: number;
  action?: string;
  actor_user_id?: string;
};

export function listAuditLogs(token: string, query: ListAuditLogsInput = {}) {
  const params = new URLSearchParams();

  if (query.limit) {
    params.set("limit", String(query.limit));
  }
  if (query.action) {
    params.set("action", query.action);
  }
  if (query.actor_user_id) {
    params.set("actor_user_id", query.actor_user_id);
  }

  const suffix = params.toString();
  const path = suffix
    ? `/auth/superadmin/audit-logs?${suffix}`
    : "/auth/superadmin/audit-logs";

  return apiRequest<AuditLog[]>(path, {
    method: "GET",
    token,
  });
}

export function getAdminAnalyticsSummary(token: string, days = 30) {
  return apiRequest<AdminAnalyticsSummary>(`/auth/admin/analytics/summary?days=${days}`, {
    method: "GET",
    token,
  });
}

export function getAdminAnalyticsTimeseries(token: string, days = 30) {
  return apiRequest<AdminAnalyticsTimeseries>(`/auth/admin/analytics/timeseries?days=${days}`, {
    method: "GET",
    token,
  });
}

export function getOpsAlerts(
  token: string,
  input: {
    limit?: number;
    max_dead_letter?: number;
    max_failed_push?: number;
    max_stale_pending_payments?: number;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 50));
  if (input.max_dead_letter !== undefined) {
    params.set("max_dead_letter", String(input.max_dead_letter));
  }
  if (input.max_failed_push !== undefined) {
    params.set("max_failed_push", String(input.max_failed_push));
  }
  if (input.max_stale_pending_payments !== undefined) {
    params.set("max_stale_pending_payments", String(input.max_stale_pending_payments));
  }

  return apiRequest<OpsAlerts>(`/ops/alerts?${params.toString()}`, {
    method: "GET",
    token,
  });
}
