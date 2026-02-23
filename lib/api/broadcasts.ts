import { API_BASE_URL } from "@/lib/http";

export type NotificationChannel = "in_app" | "email" | "push";
export type NotificationPriority = "normal" | "high";
export type DeviceType = "all" | "ios" | "android";
export type UserType = "all" | "customer" | "driver" | "merchant";
export type ServiceCategory =
  | "transport"
  | "delivery"
  | "food"
  | "shopping"
  | "jastip"
  | "services"
  | "healthcare"
  | "chat"
  | "payment"
  | "promo"
  | "system";

type RequestOptions = {
  token: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

async function request(path: string, { token, method = "GET", body }: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error((payload?.message as string) || `Request failed (${response.status})`);
  }
  if (payload?.success === false) {
    throw new Error((payload.message as string) || "Request failed");
  }

  return payload;
}

function asPaginatedResult<T>(payload: Record<string, unknown> | null): PaginatedResult<T> {
  return {
    data: Array.isArray(payload?.data) ? (payload.data as T[]) : [],
    pagination: {
      page: Number((payload?.pagination as Record<string, unknown> | undefined)?.page ?? 1),
      limit: Number((payload?.pagination as Record<string, unknown> | undefined)?.limit ?? 20),
      total: Number((payload?.pagination as Record<string, unknown> | undefined)?.total ?? 0),
      total_pages: Number((payload?.pagination as Record<string, unknown> | undefined)?.total_pages ?? 0),
    },
  };
}

export type UserIdentifier = {
  username?: string;
  email?: string;
  phone?: string;
};

export type BroadcastDispatchResult = {
  total_recipients?: number;
  successful_sends?: number;
  failed_sends?: number;
  total?: number;
  succeeded?: number;
  failed?: number;
  push_sent?: number;
  push_failed?: number;
  created_count?: number;
  sample_notification_ids?: string[];
};

export type BroadcastHistoryItem = {
  id: string;
  admin_user_id?: string | null;
  title: string;
  body: string;
  service_category: string;
  notification_type: string;
  priority: string;
  channel: string;
  target_type: "all" | "specific";
  device_type?: string | null;
  user_type?: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  sent_at?: string;
  created_at?: string;
};

export type ScheduledBroadcastItem = {
  id: string;
  admin_user_id?: string | null;
  title: string;
  body: string;
  service_category: ServiceCategory;
  notification_type: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  target_type: "all" | "specific";
  device_type?: DeviceType | null;
  user_type?: UserType | null;
  target_user_ids?: string[] | null;
  action_type?: string | null;
  action_data_json?: Record<string, unknown> | null;
  scheduled_at: string;
  status: "pending" | "sent" | "cancelled";
  recurrence_type: "once" | "daily" | "weekly" | "monthly" | "custom";
  recurrence_pattern?: string | null;
  recurrence_end_date?: string | null;
  next_scheduled_at?: string | null;
  executed_at?: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at?: string;
  updated_at?: string;
};

export type DeleteNotificationsWithinLast = "1h" | "6h" | "12h" | "1d" | "3d" | "7d" | "14d" | "30d";

export function broadcastToAll(
  token: string,
  payload: {
    title: string;
    body: string;
    channel?: NotificationChannel;
    service_category?: ServiceCategory;
    notification_type?: string;
    priority?: NotificationPriority;
    action_type?: string;
    action_data?: Record<string, unknown>;
    device_type?: DeviceType;
    user_type?: UserType;
  }
) {
  return request("/notifications/admin/broadcast-all", {
    method: "POST",
    token,
    body: {
      service_category: payload.service_category ?? "system",
      notification_type: payload.notification_type ?? "system_announcement",
      priority: payload.priority ?? "normal",
      device_type: payload.device_type ?? "all",
      user_type: payload.user_type ?? "all",
      channel: payload.channel ?? "in_app",
      title: payload.title,
      body: payload.body,
      action_type: payload.action_type,
      action_data: payload.action_data,
    },
  }).then((raw) => (raw?.data as BroadcastDispatchResult) ?? {});
}

export function sendToUsers(
  token: string,
  payload: {
    user_ids?: string[];
    user_identifiers?: UserIdentifier[];
    title: string;
    body: string;
    channel?: NotificationChannel;
    service_category?: ServiceCategory;
    notification_type?: string;
    priority?: NotificationPriority;
    action_type?: string;
    action_data?: Record<string, unknown>;
  }
) {
  return request("/notifications/admin/send-to-users", {
    method: "POST",
    token,
    body: {
      service_category: payload.service_category ?? "system",
      notification_type: payload.notification_type ?? "system_announcement",
      priority: payload.priority ?? "normal",
      channel: payload.channel ?? "in_app",
      title: payload.title,
      body: payload.body,
      action_type: payload.action_type,
      action_data: payload.action_data,
      user_ids: payload.user_ids,
      user_identifiers: payload.user_identifiers,
    },
  }).then((raw) => (raw?.data as BroadcastDispatchResult) ?? {});
}

export function sendTestPush(
  token: string,
  payload: {
    title: string;
    body: string;
    channel?: NotificationChannel;
    priority?: NotificationPriority;
    test_data?: Record<string, unknown>;
  }
) {
  return request("/notifications/admin/test-push", {
    method: "POST",
    token,
    body: {
      title: payload.title,
      body: payload.body,
      channel: payload.channel ?? "push",
      priority: payload.priority ?? "normal",
      test_data: payload.test_data ?? {},
    },
  }).then((raw) => (raw?.data as Record<string, unknown>) ?? {});
}

export function getBroadcastHistory(
  token: string,
  query: {
    service_category?: string;
    target_type?: "all" | "specific" | "all_types";
    page?: number;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (query.service_category) params.set("service_category", query.service_category);
  if (query.target_type) params.set("target_type", query.target_type);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  return request(`/notifications/admin/broadcast-history?${params.toString()}`, {
    method: "GET",
    token,
  }).then((raw) => asPaginatedResult<BroadcastHistoryItem>(raw));
}

export function deleteNotificationsByTime(token: string, within_last: DeleteNotificationsWithinLast) {
  return request("/notifications/admin/delete-by-time", {
    method: "POST",
    token,
    body: { within_last },
  }).then((raw) => ({
    deleted_count: Number(raw?.deleted_count ?? 0),
    message: String(raw?.message ?? "Notifications deleted"),
  }));
}

export function getScheduledBroadcasts(
  token: string,
  query: {
    status?: "pending" | "sent" | "cancelled" | "all";
    service_category?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.service_category) params.set("service_category", query.service_category);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));

  return request(`/notifications/admin/scheduled-broadcasts?${params.toString()}`, {
    method: "GET",
    token,
  }).then((raw) => asPaginatedResult<ScheduledBroadcastItem>(raw));
}

export function getScheduledBroadcast(token: string, id: string) {
  return request(`/notifications/admin/scheduled-broadcasts/${id}`, {
    method: "GET",
    token,
  }).then((raw) => raw?.data as ScheduledBroadcastItem);
}

export function createScheduledBroadcast(
  token: string,
  payload: {
    title: string;
    body: string;
    scheduled_at: string;
    channel?: NotificationChannel;
    service_category?: ServiceCategory;
    notification_type?: string;
    priority?: NotificationPriority;
    target_type?: "all" | "specific";
    device_type?: DeviceType;
    user_type?: UserType;
    target_user_ids?: string[];
    action_type?: string;
    action_data?: Record<string, unknown>;
    recurrence_type?: "once" | "daily" | "weekly" | "monthly" | "custom";
    recurrence_pattern?: string;
    recurrence_end_date?: string;
  }
) {
  return request("/notifications/admin/scheduled-broadcasts", {
    method: "POST",
    token,
    body: {
      title: payload.title,
      body: payload.body,
      scheduled_at: payload.scheduled_at,
      channel: payload.channel ?? "in_app",
      service_category: payload.service_category ?? "system",
      notification_type: payload.notification_type ?? "system_announcement",
      priority: payload.priority ?? "normal",
      target_type: payload.target_type ?? "all",
      device_type: payload.device_type ?? "all",
      user_type: payload.user_type ?? "all",
      target_user_ids: payload.target_user_ids,
      action_type: payload.action_type,
      action_data: payload.action_data,
      recurrence_type: payload.recurrence_type ?? "once",
      recurrence_pattern: payload.recurrence_pattern,
      recurrence_end_date: payload.recurrence_end_date,
    },
  }).then((raw) => raw?.data as ScheduledBroadcastItem);
}

export function updateScheduledBroadcast(
  token: string,
  id: string,
  payload: {
    title?: string;
    body?: string;
    scheduled_at?: string;
    channel?: NotificationChannel;
    service_category?: ServiceCategory;
    notification_type?: string;
    priority?: NotificationPriority;
    target_type?: "all" | "specific";
    device_type?: DeviceType;
    user_type?: UserType;
    target_user_ids?: string[];
    action_type?: string;
    action_data?: Record<string, unknown>;
    recurrence_type?: "once" | "daily" | "weekly" | "monthly" | "custom";
    recurrence_pattern?: string;
    recurrence_end_date?: string;
    status?: "pending" | "sent" | "cancelled";
  }
) {
  return request(`/notifications/admin/scheduled-broadcasts/${id}`, {
    method: "PUT",
    token,
    body: payload,
  }).then((raw) => raw?.data as ScheduledBroadcastItem);
}

export function deleteScheduledBroadcast(token: string, id: string) {
  return request(`/notifications/admin/scheduled-broadcasts/${id}`, {
    method: "DELETE",
    token,
  }).then((raw) => raw?.data as ScheduledBroadcastItem);
}
