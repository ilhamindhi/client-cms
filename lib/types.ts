export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  status?: string;
  display_name?: string | null;
};

export type AuthTokenSet = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
};

export type AdminUser = {
  id: string;
  email: string;
  username?: string | null;
  phone?: string | null;
  display_name?: string | null;
  roles: string[];
  status: string;
  last_login_at?: string | null;
  created_at: string;
};

export type UserRole = "user" | "admin" | "superadmin";

export type CreateAdminUserResult = {
  mode: "promoted_existing_user" | "created_new_user";
  user: {
    id: string;
    email: string;
    roles: string[];
    status: string;
  };
};

export type AuditLog = {
  id: string;
  actor_user_id?: string | null;
  actor_email?: string | null;
  actor_roles: string[];
  action: string;
  resource_type: string;
  resource_id?: string | null;
  target_user_id?: string | null;
  target_email?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  payload_json?: Record<string, unknown> | null;
  created_at: string;
};

export type UserStatus = "active" | "inactive" | "suspended";

export type SuperadminForceLogoutResult = {
  user_id: string;
  revoked_sessions: number;
};

export type SuperadminResetPasswordResult = {
  user_id: string;
  revoked_sessions: number;
  temporary_password?: string | null;
};

export type UserEmailSettings = {
  user_id: string;
  email: string;
  email_verified_at?: string | null;
  pending_email?: string | null;
  pending_email_requested_at?: string | null;
  recovery_email?: string | null;
  recovery_email_verified_at?: string | null;
  pending_recovery_email?: string | null;
  pending_recovery_email_requested_at?: string | null;
  has_recovery_email?: boolean;
  updated_at?: string | null;
};

export type MembershipPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price_amount: number | string;
  currency: string;
  billing_period: "none" | "monthly" | "yearly";
  is_free: boolean;
  is_active: boolean;
  tier_level: number;
  trial_days: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MembershipCoupon = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "percent" | "nominal";
  discount_value: number | string;
  max_discount_amount?: number | string | null;
  max_uses?: number | null;
  used_count?: number | null;
  max_uses_per_user: number | string;
  applies_to_plan_id?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GiftCode = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  reward_type: "points_random" | "membership";
  points_pool_total?: number | string | null;
  points_pool_remaining?: number | string | null;
  random_min_points: number | string;
  random_max_points?: number | string | null;
  max_points_per_user?: number | string | null;
  max_claim_per_user: number | string;
  max_redemptions?: number | string | null;
  redeemed_count: number | string;
  membership_plan_id?: string | null;
  membership_plan_name?: string | null;
  membership_duration_days?: number | string | null;
  start_at?: string | null;
  end_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminAnalyticsSummary = {
  period_days: number;
  total_users: number;
  new_users_period: number;
  active_memberships: number;
  pending_memberships: number;
  paid_orders_period: number;
  paid_gmv_period: number;
  pending_payments: number;
  active_challenge_participations: number;
  gift_redemptions_period: number;
  points_issued_period: number;
  points_spent_period: number;
};

export type AdminAnalyticsTimeseriesPoint = {
  date: string;
  new_users: number;
  paid_orders: number;
  paid_gmv: number;
  gift_redemptions: number;
  points_issued: number;
  points_spent: number;
  memberships_created: number;
  memberships_canceled: number;
};

export type AdminAnalyticsTimeseries = {
  period_days: number;
  points: AdminAnalyticsTimeseriesPoint[];
};

export type OpsAlertBreach = {
  key: "dead_letter_webhooks" | "failed_push_notifications" | "stale_pending_payments";
  value: number;
  threshold: number;
};

export type OpsAlerts = {
  ok: boolean;
  severity: "low" | "medium" | "high";
  counters: {
    dead_letter_webhooks: number;
    failed_push_notifications: number;
    stale_pending_payments: number;
  };
  thresholds: {
    dead_letter_webhooks: number;
    failed_push_notifications: number;
    stale_pending_payments: number;
  };
  breaches: OpsAlertBreach[];
  dead_letter_webhooks: Array<Record<string, unknown>>;
  failed_push_notifications: Array<Record<string, unknown>>;
  stale_pending_payments: Array<Record<string, unknown>>;
};

export type OpsReadiness = {
  status: "ready" | "not_ready";
  db_now?: string | null;
};

export type OpsSummary = {
  lookback_hours: number;
  users: {
    total: number;
    active: number;
  };
  memberships: {
    active: number;
    pending_payment: number;
  };
  orders: {
    paid_count: number;
    paid_gmv: number;
  };
  payments: {
    pending: number;
    overdue_pending: number;
    webhook_dead_letters: number;
    webhook_failures_lookback: number;
  };
  notifications: {
    push_failures_lookback: number;
    push_pending: number;
  };
};
