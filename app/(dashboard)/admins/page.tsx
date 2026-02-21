"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldAlert, UserCog, Users } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { createAdminUser, listAdminUsers } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AdminUser } from "@/lib/types";
import { formatDateTime, maskText } from "@/lib/utils";

type CreateAdminForm = {
  email: string;
  password: string;
  display_name: string;
};

const emptyForm: CreateAdminForm = {
  email: "",
  password: "",
  display_name: "",
};

export default function AdminUsersPage() {
  const { accessToken, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateAdminForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  async function loadUsers() {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await listAdminUsers(accessToken);
      setUsers(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
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

  async function onCreateAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !hasRole("superadmin")) {
      setError("Hanya superadmin yang dapat membuat admin.");
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    setError(null);

    try {
      const payload: { email: string; password?: string; display_name?: string } = {
        email: form.email.trim(),
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }
      if (form.display_name.trim()) {
        payload.display_name = form.display_name.trim();
      }

      const result = await createAdminUser(accessToken, payload);
      setSubmitResult(
        result.mode === "created_new_user"
          ? "Admin user baru berhasil dibuat."
          : "User existing berhasil dipromosikan menjadi admin.",
      );
      setForm(emptyForm);
      await loadUsers();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to save admin user");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Users</CardTitle>
          <CardDescription>
            Halaman ini menampilkan user internal. Superadmin bisa membuat admin baru atau promote user existing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, display name, role..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadUsers} type="button" isLoading={isLoading}>
                Refresh
              </Button>
              {hasRole("superadmin") ? (
                <Button type="button" leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
                  Add Admin
                </Button>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!isLoading && filtered.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No users found" description="Coba ubah kata kunci pencarian atau lakukan refresh data." />
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
                      <Badge variant={entry.status === "active" ? "success" : "danger"}>{entry.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.last_login_at)}</TableCell>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog size={18} />
                Add / Promote Admin
              </CardTitle>
              <CardDescription>
                Jika email sudah ada, user akan dipromosikan jadi admin. Jika email baru, isi password untuk membuat akun.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onCreateAdminSubmit}>
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="new.admin@example.test"
                  required
                />
                <Input
                  label="Display Name (Optional)"
                  value={form.display_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, display_name: event.target.value }))}
                  placeholder="Admin Operasional"
                />
                <Input
                  label="Password (Required if new user)"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Minimal 8 karakter"
                  hint="Kosongkan untuk promote existing user."
                />

                {submitResult ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {submitResult}
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                ) : null}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setForm(emptyForm);
                      setSubmitResult(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button type="submit" isLoading={isSubmitting}>
                    Save
                  </Button>
                </div>

                {!hasRole("superadmin") ? (
                  <p className="flex items-center gap-1 text-xs text-amber-700">
                    <ShieldAlert size={14} />
                    Hanya superadmin yang boleh membuat admin.
                  </p>
                ) : null}
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
