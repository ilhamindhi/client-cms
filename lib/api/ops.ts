import { apiRequest } from "@/lib/http";
import type { OpsReadiness, OpsSummary } from "@/lib/types";

export function getOpsReadiness() {
  return apiRequest<OpsReadiness>("/ops/readiness", { method: "GET" });
}

export function getOpsSummary(token: string, lookbackHours = 24) {
  return apiRequest<OpsSummary>(`/ops/summary?lookback_hours=${lookbackHours}`, {
    method: "GET",
    token,
  });
}
