"use client";

import { useEffect, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createPaymentMethodAdmin,
  getPaymentMethodByCodeAdmin,
  getPaymentReconcileReportAdmin,
  getPaymentWebhookRetryReportAdmin,
  listPaymentMethodsAdmin,
  reconcilePaymentsAdmin,
  retryPaymentWebhooksAdmin,
  type PaymentMethodAdminItem,
  updatePaymentMethodAdmin,
} from "@/lib/api/payments";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

function asNumber(input: string, fallback: number) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseConfigJson(input: string): Record<string, unknown> | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Config JSON harus object valid.");
  }
  return parsed as Record<string, unknown>;
}

export default function PaymentsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodAdminItem[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Payments",
    successTitle: "Payments",
  });

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("va");
  const [provider, setProvider] = useState("duitku");

  const [reconcileLimit, setReconcileLimit] = useState("300");
  const [lookbackDays, setLookbackDays] = useState("30");

  const [retryLimit, setRetryLimit] = useState("100");
  const [retryMax, setRetryMax] = useState("5");
  const [reconcileReport, setReconcileReport] = useState<Record<string, unknown> | null>(null);
  const [retryReport, setRetryReport] = useState<Record<string, unknown> | null>(null);

  const [methodEditModalOpen, setMethodEditModalOpen] = useState(false);
  const [methodEditModalLoading, setMethodEditModalLoading] = useState(false);
  const [methodEditModalSaving, setMethodEditModalSaving] = useState(false);
  const [methodEditCode, setMethodEditCode] = useState("");
  const [methodEditName, setMethodEditName] = useState("");
  const [methodEditChannel, setMethodEditChannel] = useState("");
  const [methodEditProvider, setMethodEditProvider] = useState("");
  const [methodEditIsActive, setMethodEditIsActive] = useState(true);
  const [methodEditConfigJson, setMethodEditConfigJson] = useState("");

  async function loadMethods() {
    if (!accessToken || !hasAdminAccess) return;

    setLoading(true);
    setPageError(null);
    try {
      const rows = await listPaymentMethodsAdmin(accessToken);
      setMethods(rows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateMethod(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      await createPaymentMethodAdmin(accessToken, {
        code: code.trim(),
        name: name.trim(),
        channel: channel.trim(),
        provider: provider.trim(),
        is_active: true,
      });
      setCode("");
      setName("");
      setChannel("va");
      setProvider("duitku");
      setPageMessage("Payment method created.");
      await loadMethods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create payment method");
    }
  }

  async function onToggleMethod(item: PaymentMethodAdminItem) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      await updatePaymentMethodAdmin(accessToken, item.code, { is_active: !item.is_active });
      setPageMessage(`Payment method ${item.code} ${item.is_active ? "disabled" : "enabled"}.`);
      await loadMethods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update payment method");
    }
  }

  async function onPrepareMethodEdit(item: PaymentMethodAdminItem) {
    if (!accessToken) return;
    setPageError(null);
    setPageMessage(null);
    setMethodEditModalLoading(true);
    try {
      const detail = await getPaymentMethodByCodeAdmin(accessToken, item.code);
      setMethodEditCode(String(detail.code ?? item.code));
      setMethodEditName(String(detail.name ?? item.name));
      setMethodEditChannel(String(detail.channel ?? item.channel));
      setMethodEditProvider(String(detail.provider ?? item.provider));
      setMethodEditIsActive(Boolean(detail.is_active));
      setMethodEditConfigJson(
        detail.config_json && typeof detail.config_json === "object"
          ? JSON.stringify(detail.config_json, null, 2)
          : "",
      );
      setMethodEditModalOpen(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load payment method detail");
    } finally {
      setMethodEditModalLoading(false);
    }
  }

  async function onUpdateMethod() {
    if (!accessToken || !methodEditCode.trim()) return;

    setPageError(null);
    setPageMessage(null);
    setMethodEditModalSaving(true);
    try {
      const configJson = parseConfigJson(methodEditConfigJson);
      await updatePaymentMethodAdmin(accessToken, methodEditCode.trim(), {
        name: methodEditName.trim(),
        channel: methodEditChannel.trim(),
        provider: methodEditProvider.trim(),
        is_active: methodEditIsActive,
        config_json: configJson,
      });
      setPageMessage(`Payment method ${methodEditCode.trim()} updated.`);
      setMethodEditModalOpen(false);
      await loadMethods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update payment method");
    } finally {
      setMethodEditModalSaving(false);
    }
  }

  async function onRunReconcile(dryRun: boolean) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      const result = await reconcilePaymentsAdmin(accessToken, {
        limit: asNumber(reconcileLimit, 300),
        lookback_days: asNumber(lookbackDays, 30),
        dry_run: dryRun,
      });
      setReconcileReport(result);
      setPageMessage(`Reconcile ${dryRun ? "dry-run" : "run"} finished: ${JSON.stringify(result)}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to reconcile payments");
    }
  }

  async function onRunRetryWebhooks(dryRun: boolean) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      const result = await retryPaymentWebhooksAdmin(accessToken, {
        limit: asNumber(retryLimit, 100),
        max_retry: asNumber(retryMax, 5),
        dry_run: dryRun,
      });
      setRetryReport(result);
      setPageMessage(`Retry webhooks ${dryRun ? "dry-run" : "run"} finished: ${JSON.stringify(result)}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to retry webhooks");
    }
  }

  async function onLoadReconcileReport() {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      const result = await getPaymentReconcileReportAdmin(accessToken, {
        limit: asNumber(reconcileLimit, 300),
        lookback_days: asNumber(lookbackDays, 30),
        dry_run: false,
      });
      setReconcileReport(result);
      setPageMessage("Reconcile report loaded.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load reconcile report");
    }
  }

  async function onLoadRetryReport() {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      const result = await getPaymentWebhookRetryReportAdmin(accessToken, {
        limit: asNumber(retryLimit, 100),
        max_retry: asNumber(retryMax, 5),
        dry_run: false,
      });
      setRetryReport(result);
      setPageMessage("Webhook retry report loaded.");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load webhook retry report");
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<CreditCard size={28} />} title="Admin only" description="Halaman payments untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payments Admin</CardTitle>
          <CardDescription>Kelola payment method, reconcile, dan retry webhook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadMethods()} isLoading={loading}>
              Refresh
            </Button>
          </div>
          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateMethod}>
            <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} required />
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} required />
            <Input label="Provider" value={provider} onChange={(e) => setProvider(e.target.value)} required />
            <div className="md:col-span-4">
              <Button type="submit">Create Method</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {methods.length === 0 && !loading ? (
            <EmptyState title="No methods" description="Belum ada payment method." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {methods.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.channel}</TableCell>
                    <TableCell>{item.provider}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "success" : "danger"}>{item.is_active ? "active" : "inactive"}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(item.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => void onPrepareMethodEdit(item)}>
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void onToggleMethod(item)}>
                          {item.is_active ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reconcile Payments</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input label="Limit" type="number" min="1" value={reconcileLimit} onChange={(e) => setReconcileLimit(e.target.value)} />
          <Input label="Lookback Days" type="number" min="1" value={lookbackDays} onChange={(e) => setLookbackDays(e.target.value)} />
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => void onRunReconcile(true)}>Dry Run</Button>
            <Button type="button" variant="secondary" onClick={() => void onRunReconcile(false)}>Run Reconcile</Button>
            <Button type="button" variant="ghost" onClick={() => void onLoadReconcileReport()}>Load Report</Button>
          </div>
          {reconcileReport ? (
            <pre className="md:col-span-4 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(reconcileReport, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Retry Failed Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input label="Limit" type="number" min="1" value={retryLimit} onChange={(e) => setRetryLimit(e.target.value)} />
          <Input label="Max Retry" type="number" min="1" value={retryMax} onChange={(e) => setRetryMax(e.target.value)} />
          <div className="flex items-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => void onRunRetryWebhooks(true)}>Dry Run</Button>
            <Button type="button" variant="secondary" onClick={() => void onRunRetryWebhooks(false)}>Run Retry</Button>
            <Button type="button" variant="ghost" onClick={() => void onLoadRetryReport()}>Load Report</Button>
          </div>
          {retryReport ? (
            <pre className="md:col-span-4 max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(retryReport, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      </Card>

      {methodEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !methodEditModalSaving) {
              setMethodEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="payment-method-edit-modal-title">
            <CardHeader>
              <CardTitle id="payment-method-edit-modal-title">Edit Payment Method</CardTitle>
              <CardDescription>Code: {methodEditCode}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Name" value={methodEditName} onChange={(event) => setMethodEditName(event.target.value)} required />
              <Input label="Channel" value={methodEditChannel} onChange={(event) => setMethodEditChannel(event.target.value)} required />
              <Input label="Provider" value={methodEditProvider} onChange={(event) => setMethodEditProvider(event.target.value)} required />
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={methodEditIsActive}
                  onChange={(event) => setMethodEditIsActive(event.target.checked)}
                />
                Is Active
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Config JSON (Optional)</span>
                <textarea
                  className="min-h-40 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  value={methodEditConfigJson}
                  onChange={(event) => setMethodEditConfigJson(event.target.value)}
                  placeholder='{"fee_percent": 1.5}'
                />
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setMethodEditModalOpen(false)} disabled={methodEditModalSaving}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void onUpdateMethod()}
                  isLoading={methodEditModalSaving || methodEditModalLoading}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
