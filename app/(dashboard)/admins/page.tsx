"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldAlert, UserCog, Users } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createAdminUser,
  forceLogoutUserSessions,
  listAdminUsers,
  resetUserPassword,
  setUserRoles,
  setUserStatus,
} from "@/lib/api/auth";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AdminUser, UserRole, UserStatus } from "@/lib/types";
import { formatDateTime, maskText } from "@/lib/utils";

type CreateAdminForm = {
  email: string;
  password: string;
  display_name: string;
};

type UserActionType = "status" | "roles" | "force-logout" | "reset-password";

type UserActionModalState = {
  type: UserActionType;
  user: AdminUser;
} | null;

const emptyCreateForm: CreateAdminForm = {
  email: "",
  password: "",
  display_name: "",
};

const USER_ROLE_OPTIONS: UserRole[] = ["user", "admin", "superadmin"];

function normalizeUserStatus(raw: string | null | undefined): UserStatus {
  const normalized = String(raw || "").toLowerCase();
  if (normalized === "inactive" || normalized === "suspended") {
    return normalized;
  }
  return "active";
}

function actionModalTitle(type: UserActionType) {
  if (type === "status") return "Update User Status";
  if (type === "roles") return "Update User Roles";
  if (type === "force-logout") return "Force Logout Sessions";
  return "Reset User Password";
}

function actionSubmitLabel(type: UserActionType) {
  if (type === "status") return "Save Status";
  if (type === "roles") return "Save Roles";
  if (type === "force-logout") return "Force Logout";
  return "Reset Password";
}

function needsSafetyConfirmation(actionType: UserActionType, nextStatus?: UserStatus) {
  if (actionType === "force-logout" || actionType === "reset-password") {
    return true;
  }
  if (actionType === "status" && nextStatus && nextStatus !== "active") {
    return true;
  }
  return false;
}

export default function AdminUsersPage() {
  const { accessToken, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminForm>(emptyCreateForm);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createFormError, setCreateFormError] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<UserActionModalState>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [statusValue, setStatusValue] = useState<UserStatus>("active");
  const [statusReason, setStatusReason] = useState("");

  const [roleSelection, setRoleSelection] = useState<Record<UserRole, boolean>>({
    user: true,
    admin: false,
    superadmin: false,
  });

  const [forceLogoutReason, setForceLogoutReason] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [actionConfirmed, setActionConfirmed] = useState(false);

  useFeedbackToast({
    error: pageError || createFormError || actionError,
    success: pageMessage,
    errorTitle: "Admins",
    successTitle: "Admins",
  });

  async function loadUsers() {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setPageError(null);
    try {
      const data = await listAdminUsers(accessToken);
      setUsers(data);
    } catch (caughtError) {
      setPageError(caughtError instanceof Error ? caughtError.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.email.toLowerCase().includes(q) ||
        (user.display_name || "").toLowerCase().includes(q) ||
        user.roles.join(" ").toLowerCase().includes(q)
      );
    });
  }, [search, users]);

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateForm(emptyCreateForm);
    setCreateFormError(null);
  }, []);

  const closeActionModal = useCallback(() => {
    setActionModal(null);
    setActionError(null);
    setIsActionSubmitting(false);
    setActionConfirmed(false);
  }, []);

  function openActionModal(type: UserActionType, user: AdminUser) {
    clearFeedback();
    setActionError(null);
    setActionModal({ type, user });
    setActionConfirmed(false);

    if (type === "status") {
      const currentStatus = normalizeUserStatus(user.status);
      setStatusValue(currentStatus === "active" ? "suspended" : "active");
      setStatusReason("");
      return;
    }

    if (type === "roles") {
      const userRoles = new Set((user.roles || []).map((role) => String(role).toLowerCase()));
      setRoleSelection({
        user: userRoles.has("user"),
        admin: userRoles.has("admin"),
        superadmin: userRoles.has("superadmin"),
      });
      return;
    }

    if (type === "force-logout") {
      setForceLogoutReason("");
      return;
    }

    setResetPasswordValue("");
  }

  useEffect(() => {
    if (!isCreateModalOpen && !actionModal) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (actionModal) {
        closeActionModal();
        return;
      }
      closeCreateModal();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actionModal, closeActionModal, closeCreateModal, isCreateModalOpen]);

  async function onCreateAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !hasRole("superadmin")) {
      setCreateFormError("Hanya superadmin yang dapat membuat admin.");
      return;
    }

    setIsCreateSubmitting(true);
    setCreateFormError(null);
    clearFeedback();

    try {
      const payload: { email: string; password?: string; display_name?: string } = {
        email: createForm.email.trim(),
      };

      if (createForm.password.trim()) {
        payload.password = createForm.password.trim();
      }
      if (createForm.display_name.trim()) {
        payload.display_name = createForm.display_name.trim();
      }

      const result = await createAdminUser(accessToken, payload);
      setPageMessage(
        result.mode === "created_new_user"
          ? "Admin user baru berhasil dibuat."
          : "User existing berhasil dipromosikan menjadi admin.",
      );
      closeCreateModal();
      await loadUsers();
    } catch (caughtError) {
      setCreateFormError(caughtError instanceof Error ? caughtError.message : "Failed to save admin user");
    } finally {
      setIsCreateSubmitting(false);
    }
  }

  async function onSubmitActionModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !hasRole("superadmin") || !actionModal) {
      setActionError("Hanya superadmin yang dapat melakukan aksi ini.");
      return;
    }

    setIsActionSubmitting(true);
    setActionError(null);
    clearFeedback();

    const { user, type } = actionModal;
    const requiresSafetyConfirm = needsSafetyConfirmation(type, statusValue);
    if (requiresSafetyConfirm && !actionConfirmed) {
      setActionError("Centang konfirmasi keamanan sebelum submit.");
      setIsActionSubmitting(false);
      return;
    }

    try {
      if (type === "status") {
        const updated = await setUserStatus(accessToken, user.id, {
          status: statusValue,
          reason: statusReason.trim() || undefined,
        });
        setPageMessage(
          `Status ${updated.email} menjadi ${updated.status}. Revoked sessions: ${updated.revoked_sessions}.`,
        );
      } else if (type === "roles") {
        const roles = USER_ROLE_OPTIONS.filter((role) => roleSelection[role]);
        if (roles.length === 0) {
          setActionError("Minimal pilih 1 role.");
          setIsActionSubmitting(false);
          return;
        }

        const updated = await setUserRoles(accessToken, user.id, { roles });
        setPageMessage(`Roles ${updated.email} diperbarui: ${(updated.roles || []).join(", ")}.`);
      } else if (type === "force-logout") {
        const result = await forceLogoutUserSessions(accessToken, user.id, {
          reason: forceLogoutReason.trim() || undefined,
        });
        setPageMessage(`Semua session ${user.email} direvoke. Total revoked: ${result.revoked_sessions}.`);
      } else {
        const customPassword = resetPasswordValue.trim();
        if (customPassword && customPassword.length < 8) {
          setActionError("Password custom minimal 8 karakter.");
          setIsActionSubmitting(false);
          return;
        }

        const result = await resetUserPassword(accessToken, user.id, {
          new_password: customPassword || undefined,
        });

        const temporaryPasswordText = result.temporary_password
          ? ` Temporary password: ${result.temporary_password}`
          : "";
        setPageMessage(
          `Password ${user.email} berhasil direset. Revoked sessions: ${result.revoked_sessions}.${temporaryPasswordText}`,
        );
      }

      closeActionModal();
      await loadUsers();
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : "Failed to execute action");
    } finally {
      setIsActionSubmitting(false);
    }
  }

  const isInitialLoading = isLoading && users.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            Superadmin dapat create/promote admin, update status/roles user, force logout session, dan reset credential.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" aria-busy={isLoading}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, display name, role..."
                className="pl-8"
                aria-label="Search admin users"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void loadUsers()}
                type="button"
                isLoading={isLoading}
                aria-label="Refresh admin users"
              >
                Refresh
              </Button>
              {hasRole("superadmin") ? (
                <Button
                  type="button"
                  leftIcon={<Plus size={16} />}
                  onClick={() => {
                    clearFeedback();
                    setCreateFormError(null);
                    setIsCreateModalOpen(true);
                  }}
                >
                  Add Admin
                </Button>
              ) : null}
            </div>
          </div>

          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}

          {isInitialLoading ? (
            <Table aria-label="Loading admin users">
              <thead>
                <tr>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  {hasRole("superadmin") ? <TableHead>Actions</TableHead> : null}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`admin-skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    {hasRole("superadmin") ? (
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </tbody>
            </Table>
          ) : !isLoading && filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={28} />}
              title="No users found"
              description="Coba ubah kata kunci pencarian atau lakukan refresh data."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  {hasRole("superadmin") ? <TableHead>Actions</TableHead> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell title={entry.id}>
                      <div className="font-semibold text-slate-900">{entry.email}</div>
                      <div className="text-xs text-slate-500">{maskText(entry.id, 18)}</div>
                    </TableCell>
                    <TableCell>{entry.display_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {entry.roles.map((role) => (
                          <Badge key={role} variant={role === "superadmin" ? "warning" : "info"}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={normalizeUserStatus(entry.status) === "active" ? "success" : "danger"}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.last_login_at)}</TableCell>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    {hasRole("superadmin") ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={normalizeUserStatus(entry.status) === "active" ? "outline" : "secondary"}
                            onClick={() => openActionModal("status", entry)}
                          >
                            {normalizeUserStatus(entry.status) === "active" ? "Suspend/Status" : "Activate/Status"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openActionModal("roles", entry)}
                          >
                            Set Roles
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openActionModal("force-logout", entry)}
                          >
                            Force Logout
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => openActionModal("reset-password", entry)}
                          >
                            Reset Password
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <Card className="w-full max-w-md" role="dialog" aria-modal="true" aria-labelledby="create-admin-modal-title">
            <CardHeader>
              <CardTitle id="create-admin-modal-title" className="flex items-center gap-2">
                <UserCog size={18} />
                Add / Promote Admin
              </CardTitle>
              <CardDescription>
                Jika email sudah ada, user dipromosikan jadi admin. Jika email baru, isi password untuk membuat akun.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onCreateAdminSubmit}>
                <Input
                  label="Email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="new.admin@example.test"
                  required
                />
                <Input
                  label="Display Name (Optional)"
                  value={createForm.display_name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, display_name: event.target.value }))}
                  placeholder="Admin Operasional"
                />
                <Input
                  label="Password (Required if new user)"
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Minimal 8 karakter"
                  hint="Kosongkan untuk promote existing user."
                />

                {createFormError ? <Alert variant="error">{createFormError}</Alert> : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={closeCreateModal}>
                    Close
                  </Button>
                  <Button type="submit" isLoading={isCreateSubmitting}>
                    Save
                  </Button>
                </div>

                {!hasRole("superadmin") ? (
                  <p className="flex items-center gap-1 text-xs text-[var(--color-primary-dark)]">
                    <ShieldAlert size={14} />
                    Hanya superadmin yang boleh membuat admin.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {actionModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeActionModal();
            }
          }}
        >
          <Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="admin-action-modal-title">
            <CardHeader>
              <CardTitle id="admin-action-modal-title">{actionModalTitle(actionModal.type)}</CardTitle>
              <CardDescription>
                Target user: <span className="font-semibold text-slate-800">{actionModal.user.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSubmitActionModal}>
                {actionModal.type === "status" ? (
                  <>
                    <Select
                      label="Status"
                      value={statusValue}
                      onChange={(event) => setStatusValue(event.target.value as UserStatus)}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                    </Select>
                    <Input
                      label="Reason (Optional)"
                      value={statusReason}
                      onChange={(event) => setStatusReason(event.target.value)}
                      placeholder="Keterangan perubahan status"
                    />
                  </>
                ) : null}

                {actionModal.type === "roles" ? (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Roles</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {USER_ROLE_OPTIONS.map((role) => (
                        <label key={role} className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={roleSelection[role]}
                            onChange={(event) =>
                              setRoleSelection((prev) => ({
                                ...prev,
                                [role]: event.target.checked,
                              }))
                            }
                          />
                          {role}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {actionModal.type === "force-logout" ? (
                  <Input
                    label="Reason (Optional)"
                    value={forceLogoutReason}
                    onChange={(event) => setForceLogoutReason(event.target.value)}
                    placeholder="Alasan force logout semua session"
                  />
                ) : null}

                {actionModal.type === "reset-password" ? (
                  <Input
                    label="New Password (Optional)"
                    type="password"
                    value={resetPasswordValue}
                    onChange={(event) => setResetPasswordValue(event.target.value)}
                    placeholder="Kosongkan untuk generate temporary password"
                    hint="Jika diisi, minimal 8 karakter."
                  />
                ) : null}

                {needsSafetyConfirmation(actionModal.type, statusValue) ? (
                  <>
                    <Alert variant="info">
                      Aksi ini sensitif. Konfirmasi cepat diperlukan sebelum submit.
                    </Alert>
                    <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={actionConfirmed}
                        onChange={(event) => setActionConfirmed(event.target.checked)}
                      />
                      Saya paham dampaknya dan ingin melanjutkan aksi ini.
                    </label>
                  </>
                ) : null}

                {actionError ? <Alert variant="error">{actionError}</Alert> : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={closeActionModal}>
                    Close
                  </Button>
                  <Button
                    type="submit"
                    variant={
                      actionModal.type === "reset-password" ||
                      actionModal.type === "force-logout" ||
                      (actionModal.type === "status" && statusValue !== "active")
                        ? "danger"
                        : "secondary"
                    }
                    isLoading={isActionSubmitting}
                    disabled={
                      needsSafetyConfirmation(actionModal.type, statusValue) &&
                      !actionConfirmed
                    }
                  >
                    {actionSubmitLabel(actionModal.type)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
