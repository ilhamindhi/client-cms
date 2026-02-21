import { apiRequest } from "@/lib/http";
import type { AuditLog } from "@/lib/types";

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
