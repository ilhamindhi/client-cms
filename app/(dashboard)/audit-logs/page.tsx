"use client";

import { useEffect, useState } from "react";
import { Search, ShieldX } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { listAuditLogs } from "@/lib/api/admin";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { AuditLog } from "@/lib/types";
import { formatDateTime, maskText } from "@/lib/utils";

export default function AuditLogsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");

  async function fetchLogs() {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listAuditLogs(accessToken, {
        limit: 100,
        action: action.trim() || undefined,
        actor_user_id: actorId.trim() || undefined,
      });
      setLogs(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to fetch audit logs");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (hasRole("superadmin")) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasRole]);

  if (!hasRole("superadmin")) {
    return (
      <EmptyState
        icon={<ShieldX size={28} />}
        title="Superadmin only"
        description="Halaman audit log hanya dapat diakses oleh role superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Menampilkan semua aksi penting: create/promote admin, perubahan status, dan event sensitif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Input
              label="Action"
              value={action}
              placeholder="auth.admin.created"
              onChange={(event) => setAction(event.target.value)}
            />
            <Input
              label="Actor User ID"
              value={actorId}
              placeholder="uuid actor"
              onChange={(event) => setActorId(event.target.value)}
            />
            <div className="flex items-end gap-2">
              <Button variant="outline" className="w-full" onClick={fetchLogs} isLoading={isLoading}>
                <Search size={16} />
                Filter
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!isLoading && logs.length === 0 ? (
            <EmptyState title="Audit log kosong" description="Belum ada event yang cocok dengan filter saat ini." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Created At</TableHead>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{entry.action}</div>
                      <div className="text-xs text-slate-500">{maskText(entry.id, 16)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{entry.actor_email || "-"}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(entry.actor_roles || []).map((role) => (
                          <Badge key={`${entry.id}-${role}`} variant={role === "superadmin" ? "warning" : "info"}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{entry.target_email || "-"}</TableCell>
                    <TableCell>
                      <div>{entry.resource_type}</div>
                      <div className="text-xs text-slate-500">{entry.resource_id || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-600">{entry.request_id || "-"}</div>
                      <div className="text-xs text-slate-500">{entry.ip_address || "-"}</div>
                    </TableCell>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
