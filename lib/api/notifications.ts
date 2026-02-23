import { apiRequest } from "@/lib/http";

export function listNotificationTemplatesAdmin(token: string) {
  return apiRequest<Record<string, unknown>[]>("/notifications/admin/templates", { method: "GET", token });
}

export function createNotificationTemplateAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/templates", { method: "POST", token, body: payload });
}

export function updateNotificationTemplateAdmin(token: string, code: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>(`/notifications/admin/templates/${code}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function disableNotificationTemplateAdmin(token: string, code: string) {
  return apiRequest<Record<string, unknown>>(`/notifications/admin/templates/${code}`, { method: "DELETE", token });
}

export function pushNotificationAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/push", { method: "POST", token, body: payload });
}

export function pushNotificationBroadcastAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/push/broadcast", {
    method: "POST",
    token,
    body: payload,
  });
}

export function pushNotificationFromTemplateAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/push/template", {
    method: "POST",
    token,
    body: payload,
  });
}

export function pushNotificationFromTemplateBroadcastAdmin(token: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/push/template/broadcast", {
    method: "POST",
    token,
    body: payload,
  });
}

export function dispatchPushQueueAdmin(token: string, payload: { limit?: number; max_attempts?: number; dry_run?: boolean } = {}) {
  return apiRequest<Record<string, unknown>>("/notifications/admin/dispatch-push", {
    method: "POST",
    token,
    body: payload,
  });
}
