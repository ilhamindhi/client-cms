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
  display_name?: string | null;
  roles: string[];
  status: string;
  last_login_at?: string | null;
  created_at: string;
};

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
