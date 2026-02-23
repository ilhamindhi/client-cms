"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ShoppingCart } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createOrderCouponAdmin,
  createOrderShipmentAdmin,
  disableOrderCouponAdmin,
  getOrderCouponAdmin,
  getOrderAdmin,
  listOrderCouponsAdmin,
  listOrdersAdmin,
  refundOrderAdmin,
  syncShipmentTrackingAdmin,
  type OrderAdminItem,
  updateOrderCouponAdmin,
  updateOrderStatusAdmin,
  updateShipmentAdmin,
} from "@/lib/api/orders";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

const ORDER_STATUS_OPTIONS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "canceled",
] as const;

type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

const SHIPMENT_STATUS_OPTIONS = ["pending", "shipped", "delivered", "returned", "canceled"] as const;
type ShipmentStatus = (typeof SHIPMENT_STATUS_OPTIONS)[number];

const PAYMENT_STATUS_FILTER_OPTIONS = ["", "pending", "paid", "failed", "expired", "refunded"] as const;
type PaymentStatusFilter = (typeof PAYMENT_STATUS_FILTER_OPTIONS)[number];

const COUPON_DISCOUNT_TYPES = ["percent", "nominal"] as const;
type CouponDiscountType = (typeof COUPON_DISCOUNT_TYPES)[number];
type OrderActionModalType = "status" | "shipment" | "refund";
const HIGH_VALUE_REFUND_THRESHOLD_IDR = 1_000_000;

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUS_OPTIONS.includes(value as OrderStatus);
}

function parseObjectJson(value: string): Record<string, unknown> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Payload JSON harus object valid.");
  }
  return parsed as Record<string, unknown>;
}

function isShipmentStatus(value: string): value is ShipmentStatus {
  return SHIPMENT_STATUS_OPTIONS.includes(value as ShipmentStatus);
}

export default function OrdersPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");
  const canManageRiskyOps = hasRole("superadmin");

  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderAdminItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null);
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("");
  const [userIdFilter, setUserIdFilter] = useState("");

  const [statusOrderId, setStatusOrderId] = useState("");
  const [statusValue, setStatusValue] = useState<OrderStatus>("processing");
  const [statusNote, setStatusNote] = useState("");

  const [shipmentOrderId, setShipmentOrderId] = useState("");
  const [shipmentCourierName, setShipmentCourierName] = useState("JNE");
  const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState("");
  const [shipmentCourierCode, setShipmentCourierCode] = useState("");
  const [shipmentServiceName, setShipmentServiceName] = useState("");
  const [shipmentTrackingUrl, setShipmentTrackingUrl] = useState("");
  const [shipmentEtaAt, setShipmentEtaAt] = useState("");

  const [refundOrderId, setRefundOrderId] = useState("");
  const [refundAmountIdr, setRefundAmountIdr] = useState("");
  const [refundReason, setRefundReason] = useState("manual refund");
  const [refundProviderReference, setRefundProviderReference] = useState("");
  const [refundRestockItems, setRefundRestockItems] = useState(true);
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [refundHighValueConfirmed, setRefundHighValueConfirmed] = useState(false);
  const [refundApprovalNote, setRefundApprovalNote] = useState("");

  const [trackingShipmentId, setTrackingShipmentId] = useState("");
  const [trackingForce, setTrackingForce] = useState(true);
  const [shipmentUpdateId, setShipmentUpdateId] = useState("");
  const [shipmentUpdateStatus, setShipmentUpdateStatus] = useState<ShipmentStatus>("shipped");
  const [shipmentUpdateCourierCode, setShipmentUpdateCourierCode] = useState("");
  const [shipmentUpdateTrackingUrl, setShipmentUpdateTrackingUrl] = useState("");
  const [shipmentUpdateEtaAt, setShipmentUpdateEtaAt] = useState("");
  const [shipmentUpdatePayloadJson, setShipmentUpdatePayloadJson] = useState("");
  const [orderActionModal, setOrderActionModal] = useState<{ type: OrderActionModalType; orderId: string } | null>(null);
  const [orderActionModalSaving, setOrderActionModalSaving] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponName, setCouponName] = useState("");
  const [couponDiscountType, setCouponDiscountType] = useState<CouponDiscountType>("percent");
  const [couponDiscountValue, setCouponDiscountValue] = useState("10");
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [couponMaxUsesPerUser, setCouponMaxUsesPerUser] = useState("1");
  const [couponIsActive, setCouponIsActive] = useState(true);

  const [couponEditId, setCouponEditId] = useState("");
  const [couponEditName, setCouponEditName] = useState("");
  const [couponEditDiscountType, setCouponEditDiscountType] = useState<CouponDiscountType>("percent");
  const [couponEditDiscountValue, setCouponEditDiscountValue] = useState("10");
  const [couponEditIsActive, setCouponEditIsActive] = useState(true);
  const [couponEditModalOpen, setCouponEditModalOpen] = useState(false);
  const [couponEditModalSaving, setCouponEditModalSaving] = useState(false);
  const [couponEditModalDisabling, setCouponEditModalDisabling] = useState(false);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Orders",
    successTitle: "Orders",
  });

  async function loadOrders() {
    if (!accessToken || !hasAdminAccess) return;
    setLoading(true);
    setPageError(null);
    try {
      const [orderRows, couponRows] = await Promise.all([
        listOrdersAdmin(accessToken, {
          status: statusFilter || undefined,
          payment_status: paymentStatusFilter || undefined,
          user_id: userIdFilter || undefined,
          limit: 100,
        }),
        listOrderCouponsAdmin(accessToken, { limit: 100 }),
      ]);
      setOrders(orderRows);
      setCoupons(couponRows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  function clearFeedback() {
    setPageError(null);
    setPageMessage(null);
  }

  async function onOpenOrder(orderId: string) {
    if (!accessToken) return;
    clearFeedback();
    try {
      const data = await getOrderAdmin(accessToken, orderId);
      setSelectedOrder(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load order detail");
    }
  }

  function onPrepareStatus(order: OrderAdminItem) {
    setStatusOrderId(order.id);
    if (isOrderStatus(order.status)) {
      setStatusValue(order.status);
    }
    setStatusNote("");
    setOrderActionModal({ type: "status", orderId: order.id });
  }

  async function onSubmitStatus() {
    if (!accessToken || !statusOrderId.trim()) return;

    clearFeedback();
    setOrderActionModalSaving(true);
    try {
      await updateOrderStatusAdmin(accessToken, statusOrderId.trim(), {
        status: statusValue,
        note: statusNote.trim() || undefined,
      });
      setPageMessage(`Order ${statusOrderId.trim()} status updated.`);
      setOrderActionModal(null);
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setOrderActionModalSaving(false);
    }
  }

  function onPrepareShipment(order: OrderAdminItem) {
    setShipmentOrderId(order.id);
    setShipmentTrackingNumber("");
    setShipmentCourierName("JNE");
    setShipmentCourierCode("");
    setShipmentServiceName("");
    setShipmentTrackingUrl("");
    setShipmentEtaAt("");
    setOrderActionModal({ type: "shipment", orderId: order.id });
  }

  async function onSubmitShipment() {
    if (!accessToken || !shipmentOrderId.trim()) return;
    if (!shipmentCourierName.trim() || !shipmentTrackingNumber.trim()) {
      setPageError("Order ID, courier name, dan tracking number wajib diisi.");
      return;
    }

    clearFeedback();
    setOrderActionModalSaving(true);
    try {
      await createOrderShipmentAdmin(accessToken, shipmentOrderId.trim(), {
        courier_name: shipmentCourierName.trim(),
        tracking_number: shipmentTrackingNumber.trim(),
        courier_code: shipmentCourierCode.trim() || undefined,
        service_name: shipmentServiceName.trim() || undefined,
        tracking_url: shipmentTrackingUrl.trim() || undefined,
        eta_at: shipmentEtaAt ? new Date(shipmentEtaAt).toISOString() : undefined,
      });
      setPageMessage(`Shipment created for order ${shipmentOrderId.trim()}.`);
      setShipmentTrackingNumber("");
      setOrderActionModal(null);
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create shipment");
    } finally {
      setOrderActionModalSaving(false);
    }
  }

  async function onSubmitShipmentUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !shipmentUpdateId.trim()) return;

    clearFeedback();
    try {
      const payloadJson = parseObjectJson(shipmentUpdatePayloadJson);
      await updateShipmentAdmin(accessToken, shipmentUpdateId.trim(), {
        status: shipmentUpdateStatus,
        courier_code: shipmentUpdateCourierCode.trim() || undefined,
        tracking_url: shipmentUpdateTrackingUrl.trim() || undefined,
        eta_at: shipmentUpdateEtaAt ? new Date(shipmentUpdateEtaAt).toISOString() : undefined,
        payload_json: payloadJson,
      });
      setPageMessage(`Shipment ${shipmentUpdateId.trim()} updated.`);
      setShipmentUpdatePayloadJson("");
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update shipment");
    }
  }

  function onPrepareShipmentUpdateFromDetail(shipment: Record<string, unknown>) {
    const shipmentId = String(shipment.id ?? "");
    const rawStatus = String(shipment.status ?? "pending");
    setShipmentUpdateId(shipmentId);
    setShipmentUpdateStatus(isShipmentStatus(rawStatus) ? rawStatus : "pending");
    setShipmentUpdateCourierCode(String(shipment.courier_code ?? ""));
    setShipmentUpdateTrackingUrl(String(shipment.tracking_url ?? ""));
    setShipmentUpdateEtaAt("");
    setShipmentUpdatePayloadJson("");
    setPageMessage(`Shipment ${shipmentId} loaded ke form update.`);
  }

  async function onSyncShipmentFromDetail(shipmentId: string) {
    if (!accessToken || !shipmentId.trim()) return;

    clearFeedback();
    try {
      await syncShipmentTrackingAdmin(accessToken, shipmentId.trim(), { force: true });
      setPageMessage(`Shipment tracking sync triggered for ${shipmentId.trim()}.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to sync tracking");
    }
  }

  function onPrepareRefund(order: OrderAdminItem) {
    if (!canManageRiskyOps) {
      setPageError("Aksi refund hanya untuk superadmin.");
      return;
    }
    setRefundOrderId(order.id);
    setRefundAmountIdr("");
    setRefundProviderReference("");
    setRefundReason("manual refund");
    setRefundRestockItems(true);
    setRefundConfirmed(false);
    setRefundHighValueConfirmed(false);
    setRefundApprovalNote("");
    setOrderActionModal({ type: "refund", orderId: order.id });
  }

  async function onSubmitRefund() {
    if (!accessToken || !refundOrderId.trim()) return;
    if (!canManageRiskyOps) {
      setPageError("Aksi refund hanya untuk superadmin.");
      return;
    }
    if (!refundReason.trim()) {
      setPageError("Refund reason wajib diisi.");
      return;
    }
    if (!refundConfirmed) {
      setPageError("Centang konfirmasi refund sebelum melanjutkan.");
      return;
    }

    const selectedRefundOrder = orders.find((entry) => entry.id === refundOrderId.trim());
    const selectedRefundOrderTotal = Number(selectedRefundOrder?.grand_total ?? 0);
    const refundAmount = asOptionalNumber(refundAmountIdr) ?? selectedRefundOrderTotal;
    const needsHighValueApproval = refundAmount >= HIGH_VALUE_REFUND_THRESHOLD_IDR;
    if (needsHighValueApproval && !refundHighValueConfirmed) {
      setPageError(`Refund >= Rp ${HIGH_VALUE_REFUND_THRESHOLD_IDR.toLocaleString("id-ID")} perlu konfirmasi tambahan.`);
      return;
    }
    if (needsHighValueApproval && !refundApprovalNote.trim()) {
      setPageError("Approval note wajib untuk refund nominal besar.");
      return;
    }

    clearFeedback();
    setOrderActionModalSaving(true);
    try {
      await refundOrderAdmin(accessToken, refundOrderId.trim(), {
        amount_idr: asOptionalNumber(refundAmountIdr),
        reason: refundReason.trim(),
        provider_reference: refundProviderReference.trim() || undefined,
        restock_items: refundRestockItems,
        confirm_high_value: needsHighValueApproval ? refundHighValueConfirmed : false,
        approval_note: needsHighValueApproval ? refundApprovalNote.trim() : undefined,
      });
      setPageMessage(`Refund requested for order ${refundOrderId.trim()}.`);
      setOrderActionModal(null);
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to refund order");
    } finally {
      setOrderActionModalSaving(false);
    }
  }

  async function onSubmitSyncTracking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !trackingShipmentId.trim()) return;

    clearFeedback();
    try {
      await syncShipmentTrackingAdmin(accessToken, trackingShipmentId.trim(), { force: trackingForce });
      setPageMessage(`Shipment tracking sync triggered for ${trackingShipmentId.trim()}.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to sync tracking");
    }
  }

  async function onCreateCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    if (!couponCode.trim() || !couponName.trim()) {
      setPageError("Coupon code dan name wajib diisi.");
      return;
    }

    clearFeedback();
    try {
      await createOrderCouponAdmin(accessToken, {
        code: couponCode.trim(),
        name: couponName.trim(),
        discount_type: couponDiscountType,
        discount_value: asNumber(couponDiscountValue, 0),
        max_uses: asOptionalNumber(couponMaxUses),
        max_uses_per_user: Math.max(1, Math.floor(asNumber(couponMaxUsesPerUser, 1))),
        is_active: couponIsActive,
      });
      setCouponCode("");
      setCouponName("");
      setCouponDiscountType("percent");
      setCouponDiscountValue("10");
      setCouponMaxUses("");
      setCouponMaxUsesPerUser("1");
      setCouponIsActive(true);
      setPageMessage("Order coupon created.");
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create order coupon");
    }
  }

  async function onPrepareCouponEdit(entry: Record<string, unknown>) {
    if (!accessToken) return;
    const id = String(entry.id ?? "");
    if (!id) return;

    clearFeedback();
    setCouponEditModalSaving(true);
    try {
      const detail = await getOrderCouponAdmin(accessToken, id);
      setCouponEditId(id);
      setCouponEditName(String(detail.name ?? ""));
      const rawDiscountType = String(detail.discount_type ?? "percent");
      setCouponEditDiscountType(rawDiscountType === "nominal" ? "nominal" : "percent");
      setCouponEditDiscountValue(String(detail.discount_value ?? "0"));
      setCouponEditIsActive(Boolean(detail.is_active));
      setCouponEditModalOpen(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load coupon detail");
      return;
    } finally {
      setCouponEditModalSaving(false);
    }
  }

  async function onUpdateCoupon() {
    if (!accessToken || !couponEditId.trim()) return;

    clearFeedback();
    setCouponEditModalSaving(true);
    try {
      await updateOrderCouponAdmin(accessToken, couponEditId.trim(), {
        name: couponEditName.trim() || undefined,
        discount_type: couponEditDiscountType,
        discount_value: asNumber(couponEditDiscountValue, 0),
        is_active: couponEditIsActive,
      });
      setPageMessage(`Coupon ${couponEditId.trim()} updated.`);
      setCouponEditModalOpen(false);
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update coupon");
    } finally {
      setCouponEditModalSaving(false);
    }
  }

  async function onDisableCoupon() {
    if (!accessToken || !couponEditId.trim()) return;

    clearFeedback();
    setCouponEditModalDisabling(true);
    try {
      await disableOrderCouponAdmin(accessToken, couponEditId.trim());
      setPageMessage(`Coupon ${couponEditId.trim()} disabled.`);
      setCouponEditModalOpen(false);
      await loadOrders();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to disable coupon");
    } finally {
      setCouponEditModalDisabling(false);
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<ShoppingCart size={28} />} title="Admin only" description="Halaman orders untuk admin/superadmin." />;
  }

  const selectedShipments =
    selectedOrder && Array.isArray(selectedOrder.shipments)
      ? (selectedOrder.shipments as Record<string, unknown>[])
      : [];
  const selectedRefundOrder = orders.find((entry) => entry.id === refundOrderId);
  const selectedRefundOrderTotal = Number(selectedRefundOrder?.grand_total ?? 0);
  const currentRefundAmount = asOptionalNumber(refundAmountIdr) ?? selectedRefundOrderTotal;
  const refundNeedsHighValueApproval = currentRefundAmount >= HIGH_VALUE_REFUND_THRESHOLD_IDR;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Orders Admin</CardTitle>
          <CardDescription>Kelola lifecycle order, shipment, refund, tracking, dan coupon order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageRiskyOps ? (
            <Alert variant="info">Role admin bisa kelola order/shipment, tetapi refund hanya bisa oleh superadmin.</Alert>
          ) : null}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="pending" />
            <Select
              label="Payment Status"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
            >
              {PAYMENT_STATUS_FILTER_OPTIONS.map((entry) => (
                <option key={entry || "all"} value={entry}>
                  {entry || "all"}
                </option>
              ))}
            </Select>
            <Input label="User ID" value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value)} placeholder="uuid" />
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadOrders()} isLoading={loading}>
                Refresh
              </Button>
            </div>
          </div>
          {pageError ? <Alert variant="error">{pageError}</Alert> : null}
          {pageMessage ? <Alert variant="success">{pageMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Update Shipment</CardTitle>
          <CardDescription>Update status shipment via shipment ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={onSubmitShipmentUpdate}>
            <Input label="Shipment ID" value={shipmentUpdateId} onChange={(e) => setShipmentUpdateId(e.target.value)} placeholder="uuid" required />
            <Select
              label="Status"
              value={shipmentUpdateStatus}
              onChange={(e) => setShipmentUpdateStatus(e.target.value as ShipmentStatus)}
            >
              {SHIPMENT_STATUS_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Input
              label="Courier Code (Optional)"
              value={shipmentUpdateCourierCode}
              onChange={(e) => setShipmentUpdateCourierCode(e.target.value)}
              placeholder="jne"
            />
            <Input
              label="Tracking URL (Optional)"
              value={shipmentUpdateTrackingUrl}
              onChange={(e) => setShipmentUpdateTrackingUrl(e.target.value)}
              placeholder="https://..."
            />
            <Input
              label="ETA (Optional)"
              type="datetime-local"
              value={shipmentUpdateEtaAt}
              onChange={(e) => setShipmentUpdateEtaAt(e.target.value)}
            />
            <Input
              label="Payload JSON (Optional)"
              value={shipmentUpdatePayloadJson}
              onChange={(e) => setShipmentUpdatePayloadJson(e.target.value)}
              placeholder='{\"provider_status\":\"on_transit\"}'
            />
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="secondary">
                Update Shipment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipment Tracking Sync</CardTitle>
          <CardDescription>Trigger sinkronisasi tracking shipment manual.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onSubmitSyncTracking}>
            <Input label="Shipment ID" value={trackingShipmentId} onChange={(e) => setTrackingShipmentId(e.target.value)} placeholder="uuid" required />
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input type="checkbox" checked={trackingForce} onChange={(e) => setTrackingForce(e.target.checked)} />
              Force sync
            </label>
            <div className="flex items-end md:col-span-2">
              <Button type="submit" variant="outline">
                Sync Tracking
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders List</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 && !loading ? (
            <EmptyState title="No orders" description="Belum ada order sesuai filter." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Order ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.user_id}</TableCell>
                    <TableCell>
                      <Badge variant="info">{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.payment_status === "paid" ? "success" : "warning"}>{order.payment_status}</Badge>
                    </TableCell>
                    <TableCell>Rp {Number(order.grand_total || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{formatDateTime(order.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => void onOpenOrder(order.id)}>
                          Detail
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => onPrepareStatus(order)}>
                          Edit Status
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => onPrepareShipment(order)}>
                          Edit Shipment
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => onPrepareRefund(order)}
                          disabled={!canManageRiskyOps}
                          title={!canManageRiskyOps ? "Hanya superadmin" : undefined}
                        >
                          Edit Refund
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

      {selectedOrder ? (
        <Card>
          <CardHeader>
            <CardTitle>Order Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Shipments</h3>
              {selectedShipments.length === 0 ? (
                <Alert variant="info">Belum ada shipment pada order ini.</Alert>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedShipments.map((shipment, index) => (
                      <TableRow key={`selected-order-shipment-${index}`}>
                        <TableCell>{String(shipment.id ?? "-")}</TableCell>
                        <TableCell>{String(shipment.courier_name ?? "-")}</TableCell>
                        <TableCell>{String(shipment.tracking_number ?? "-")}</TableCell>
                        <TableCell>
                          <Badge variant="info">{String(shipment.status ?? "-")}</Badge>
                        </TableCell>
                        <TableCell>{formatDateTime((shipment.updated_at as string) ?? null)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => onPrepareShipmentUpdateFromDetail(shipment)}>
                              Prepare Update
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void onSyncShipmentFromDetail(String(shipment.id ?? ""))}
                            >
                              Sync
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(selectedOrder, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {orderActionModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !orderActionModalSaving) {
              setOrderActionModal(null);
            }
          }}
        >
          <Card className="w-full max-w-4xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="order-action-modal-title">
            <CardHeader>
              <CardTitle id="order-action-modal-title">
                {orderActionModal.type === "status"
                  ? "Edit Order Status"
                  : orderActionModal.type === "shipment"
                    ? "Edit Shipment"
                    : "Edit Refund"}
              </CardTitle>
              <CardDescription>Order ID: {orderActionModal.orderId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderActionModal.type === "status" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Select label="Status" value={statusValue} onChange={(e) => setStatusValue(e.target.value as OrderStatus)}>
                    {ORDER_STATUS_OPTIONS.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </Select>
                  <Input label="Note (Optional)" className="md:col-span-2" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
                </div>
              ) : null}

              {orderActionModal.type === "shipment" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label="Courier Name" value={shipmentCourierName} onChange={(e) => setShipmentCourierName(e.target.value)} required />
                  <Input label="Tracking Number" value={shipmentTrackingNumber} onChange={(e) => setShipmentTrackingNumber(e.target.value)} required />
                  <Input label="Courier Code" value={shipmentCourierCode} onChange={(e) => setShipmentCourierCode(e.target.value)} placeholder="jne" />
                  <Input label="Service Name" value={shipmentServiceName} onChange={(e) => setShipmentServiceName(e.target.value)} placeholder="REG" />
                  <Input
                    label="Tracking URL"
                    className="md:col-span-2"
                    value={shipmentTrackingUrl}
                    onChange={(e) => setShipmentTrackingUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <Input label="ETA (Optional)" type="datetime-local" value={shipmentEtaAt} onChange={(e) => setShipmentEtaAt(e.target.value)} />
                </div>
              ) : null}

              {orderActionModal.type === "refund" ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label="Amount IDR (Optional)" type="number" min="0" value={refundAmountIdr} onChange={(e) => setRefundAmountIdr(e.target.value)} />
                  <Input label="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} required />
                  <Input
                    label="Provider Reference (Optional)"
                    className="md:col-span-2"
                    value={refundProviderReference}
                    onChange={(e) => setRefundProviderReference(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                    <input type="checkbox" checked={refundRestockItems} onChange={(e) => setRefundRestockItems(e.target.checked)} />
                    Restock items
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                    <input type="checkbox" checked={refundConfirmed} onChange={(e) => setRefundConfirmed(e.target.checked)} />
                    Saya konfirmasi eksekusi refund ini
                  </label>
                  {refundNeedsHighValueApproval ? (
                    <>
                      <Alert variant="info" className="md:col-span-2">
                        Refund nominal besar terdeteksi ({`Rp ${currentRefundAmount.toLocaleString("id-ID")}`}). Butuh konfirmasi tambahan.
                      </Alert>
                      <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                        <input
                          type="checkbox"
                          checked={refundHighValueConfirmed}
                          onChange={(e) => setRefundHighValueConfirmed(e.target.checked)}
                        />
                        Saya setuju proses refund nominal besar ini
                      </label>
                      <Input
                        label="Approval Note (Required untuk nominal besar)"
                        className="md:col-span-2"
                        value={refundApprovalNote}
                        onChange={(e) => setRefundApprovalNote(e.target.value)}
                        placeholder="Alasan approval refund nominal besar"
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOrderActionModal(null)} disabled={orderActionModalSaving}>
                  Close
                </Button>
                {orderActionModal.type === "status" ? (
                  <Button type="button" variant="secondary" onClick={() => void onSubmitStatus()} isLoading={orderActionModalSaving}>
                    Save Status
                  </Button>
                ) : null}
                {orderActionModal.type === "shipment" ? (
                  <Button type="button" variant="secondary" onClick={() => void onSubmitShipment()} isLoading={orderActionModalSaving}>
                    Save Shipment
                  </Button>
                ) : null}
                {orderActionModal.type === "refund" ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => void onSubmitRefund()}
                    isLoading={orderActionModalSaving}
                    disabled={!canManageRiskyOps}
                    title={!canManageRiskyOps ? "Hanya superadmin" : undefined}
                  >
                    Save Refund
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Order Coupons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid grid-cols-1 gap-3 border-b border-[var(--color-border)] pb-4 md:grid-cols-4" onSubmit={onCreateCoupon}>
            <Input label="Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} required />
            <Input label="Name" value={couponName} onChange={(e) => setCouponName(e.target.value)} required />
            <Select
              label="Discount Type"
              value={couponDiscountType}
              onChange={(e) => setCouponDiscountType(e.target.value as CouponDiscountType)}
            >
              {COUPON_DISCOUNT_TYPES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
            <Input label="Discount Value" type="number" min="1" value={couponDiscountValue} onChange={(e) => setCouponDiscountValue(e.target.value)} required />
            <Input label="Max Uses (Optional)" type="number" min="1" value={couponMaxUses} onChange={(e) => setCouponMaxUses(e.target.value)} />
            <Input
              label="Max Uses Per User"
              type="number"
              min="1"
              value={couponMaxUsesPerUser}
              onChange={(e) => setCouponMaxUsesPerUser(e.target.value)}
              required
            />
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
              <input type="checkbox" checked={couponIsActive} onChange={(e) => setCouponIsActive(e.target.checked)} />
              Active
            </label>
            <div className="flex items-end">
              <Button type="submit">Create Coupon</Button>
            </div>
          </form>

          {coupons.length === 0 ? (
            <EmptyState title="No coupons" description="Belum ada coupon order." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>ID</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {coupons.map((entry, index) => (
                  <TableRow key={`coupon-${index}`}>
                    <TableCell>{String(entry.id ?? "-")}</TableCell>
                    <TableCell>{String(entry.code ?? "-")}</TableCell>
                    <TableCell>{String(entry.name ?? "-")}</TableCell>
                    <TableCell>
                      {String(entry.discount_type ?? "-")} {String(entry.discount_value ?? "-")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={Boolean(entry.is_active) ? "success" : "danger"}>{String(entry.is_active ? "active" : "inactive")}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime((entry.updated_at as string) ?? null)}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void onPrepareCouponEdit(entry)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {couponEditModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !couponEditModalSaving && !couponEditModalDisabling) {
              setCouponEditModalOpen(false);
            }
          }}
        >
          <Card className="w-full max-w-3xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="order-coupon-edit-modal-title">
            <CardHeader>
              <CardTitle id="order-coupon-edit-modal-title">Edit Order Coupon</CardTitle>
              <CardDescription>ID: {couponEditId}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input label="Name" value={couponEditName} onChange={(e) => setCouponEditName(e.target.value)} />
              <Select
                label="Discount Type"
                value={couponEditDiscountType}
                onChange={(e) => setCouponEditDiscountType(e.target.value as CouponDiscountType)}
              >
                {COUPON_DISCOUNT_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </Select>
              <Input
                label="Discount Value"
                type="number"
                min="1"
                value={couponEditDiscountValue}
                onChange={(e) => setCouponEditDiscountValue(e.target.value)}
              />
              <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
                <input type="checkbox" checked={couponEditIsActive} onChange={(e) => setCouponEditIsActive(e.target.checked)} />
                Active
              </label>
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCouponEditModalOpen(false)}
                  disabled={couponEditModalSaving || couponEditModalDisabling}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void onDisableCoupon()}
                  isLoading={couponEditModalDisabling}
                  disabled={couponEditModalSaving}
                >
                  Disable
                </Button>
                <Button type="button" variant="outline" onClick={() => void onUpdateCoupon()} isLoading={couponEditModalSaving}>
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
