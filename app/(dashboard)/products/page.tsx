"use client";

import { useEffect, useState } from "react";
import { Boxes, RefreshCw } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  adjustProductStockAdmin,
  createProductAdmin,
  disableProductAdmin,
  listProductStockMovementsAdmin,
  listProductsAdmin,
  updateProductAdmin,
  type ProductAdminItem,
} from "@/lib/api/products";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function ProductsPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");
  const canManageRiskyOps = hasRole("superadmin");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductAdminItem[]>([]);
  const [stockMovements, setStockMovements] = useState<Record<string, unknown>[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Products",
    successTitle: "Products",
  });

  const [title, setTitle] = useState("");
  const [priceAmount, setPriceAmount] = useState("0");
  const [stock, setStock] = useState("0");
  const [category, setCategory] = useState("");
  const [stockModalProduct, setStockModalProduct] = useState<ProductAdminItem | null>(null);
  const [stockDeltaInput, setStockDeltaInput] = useState("1");
  const [stockReasonInput, setStockReasonInput] = useState("manual_adjustment");
  const [stockConfirmed, setStockConfirmed] = useState(false);
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [deleteModalProduct, setDeleteModalProduct] = useState<ProductAdminItem | null>(null);
  const [deleteModalSubmitting, setDeleteModalSubmitting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  async function loadProducts() {
    if (!accessToken || !hasAdminAccess) return;
    setLoading(true);
    setPageError(null);
    try {
      const data = await listProductsAdmin(accessToken, { q: query || undefined, limit: 100, offset: 0 });
      setProducts(data);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess]);

  async function onCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    setSaving(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await createProductAdmin(accessToken, {
        title: title.trim(),
        price_amount: asNumber(priceAmount, 0),
        stock: Math.max(0, Math.floor(asNumber(stock, 0))),
        currency: "IDR",
        category: category.trim() || undefined,
        is_active: true,
      });
      setTitle("");
      setPriceAmount("0");
      setStock("0");
      setCategory("");
      setPageMessage("Product created.");
      await loadProducts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive(item: ProductAdminItem) {
    if (!accessToken) return;

    setPageError(null);
    setPageMessage(null);
    try {
      await updateProductAdmin(accessToken, item.id, { is_active: !Boolean(item.is_active) });
      setPageMessage(`Product ${item.title} ${item.is_active ? "disabled" : "enabled"}.`);
      await loadProducts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update product");
    }
  }

  function closeStockModal() {
    setStockModalProduct(null);
    setStockDeltaInput("1");
    setStockReasonInput("manual_adjustment");
    setStockConfirmed(false);
    setStockSubmitting(false);
  }

  function openStockModal(item: ProductAdminItem) {
    setPageError(null);
    setPageMessage(null);
    setStockModalProduct(item);
    setStockDeltaInput("1");
    setStockReasonInput("manual_adjustment");
    setStockConfirmed(false);
  }

  function closeDeleteModal() {
    setDeleteModalProduct(null);
    setDeleteModalSubmitting(false);
    setDeleteConfirmed(false);
    setDeleteReason("");
  }

  function openDeleteModal(item: ProductAdminItem) {
    if (!canManageRiskyOps) {
      setPageError("Aksi delete product hanya untuk superadmin.");
      return;
    }
    setPageError(null);
    setPageMessage(null);
    setDeleteModalProduct(item);
    setDeleteConfirmed(false);
    setDeleteReason("");
  }

  useEffect(() => {
    if (!stockModalProduct) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeStockModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stockModalProduct]);

  function requiresStockSafetyConfirmation(delta: number) {
    return delta < 0 || Math.abs(delta) >= 100;
  }

  async function onSubmitStockAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !stockModalProduct) return;

    const delta = Math.trunc(asNumber(stockDeltaInput, 0));
    const reason = stockReasonInput.trim();
    if (delta === 0) {
      setPageError("Delta harus bukan 0.");
      return;
    }
    if (!reason) {
      setPageError("Reason wajib diisi.");
      return;
    }

    if (requiresStockSafetyConfirmation(delta) && !stockConfirmed) {
      setPageError("Centang konfirmasi keamanan sebelum simpan adjustment sensitif.");
      return;
    }

    setStockSubmitting(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await adjustProductStockAdmin(accessToken, stockModalProduct.id, { delta, reason });
      setPageMessage(`Stock ${stockModalProduct.title} adjusted (${delta}).`);
      await loadProducts();
      if (selectedProductId === stockModalProduct.id) {
        const rows = await listProductStockMovementsAdmin(accessToken, stockModalProduct.id, { limit: 20, offset: 0 });
        setStockMovements(rows);
      }
      closeStockModal();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setStockSubmitting(false);
    }
  }

  async function onDeleteProduct() {
    if (!accessToken || !deleteModalProduct) return;
    if (!canManageRiskyOps) {
      setPageError("Aksi delete product hanya untuk superadmin.");
      return;
    }
    if (!deleteConfirmed) {
      setPageError("Centang konfirmasi delete product sebelum melanjutkan.");
      return;
    }
    if (!deleteReason.trim()) {
      setPageError("Reason delete product wajib diisi.");
      return;
    }

    setDeleteModalSubmitting(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await disableProductAdmin(accessToken, deleteModalProduct.id, deleteReason.trim());
      setPageMessage(`Product ${deleteModalProduct.title} deleted.`);
      if (selectedProductId === deleteModalProduct.id) {
        setSelectedProductId("");
        setStockMovements([]);
      }
      closeDeleteModal();
      await loadProducts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to delete product");
    } finally {
      setDeleteModalSubmitting(false);
    }
  }

  async function onLoadMovements(item: ProductAdminItem) {
    if (!accessToken) return;

    setSelectedProductId(item.id);
    setPageError(null);
    try {
      const rows = await listProductStockMovementsAdmin(accessToken, item.id, { limit: 20, offset: 0 });
      setStockMovements(rows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load stock movements");
    }
  }

  if (!hasAdminAccess) {
    return <EmptyState icon={<Boxes size={28} />} title="Admin only" description="Halaman products untuk admin/superadmin." />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Products Admin</CardTitle>
          <CardDescription>Kelola produk, status aktif, dan stock adjustment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageRiskyOps ? (
            <Alert variant="info">Role admin bisa create/update/stock, tetapi delete product hanya superadmin.</Alert>
          ) : null}
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onCreateProduct}>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Input label="Price (IDR)" type="number" min="0" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} required />
            <Input label="Stock" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" isLoading={saving}>Create Product</Button>
            </div>
          </form>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input label="Search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="title/category" />
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" leftIcon={<RefreshCw size={16} />} onClick={() => void loadProducts()} isLoading={loading}>
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
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 && !loading ? (
            <EmptyState title="No products" description="Belum ada data product." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.title}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>Rp {Number(item.price_amount || 0).toLocaleString("id-ID")}</TableCell>
                    <TableCell>{Number(item.stock || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? "success" : "danger"}>{item.is_active ? "active" : "inactive"}</Badge>
                    </TableCell>
                    <TableCell>{formatDateTime(item.updated_at || item.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void onToggleActive(item)}>
                          {item.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openStockModal(item)}>
                          Adjust Stock
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void onLoadMovements(item)}>
                          Movements
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => openDeleteModal(item)}
                          disabled={!canManageRiskyOps}
                          title={!canManageRiskyOps ? "Hanya superadmin" : undefined}
                        >
                          Delete
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

      {selectedProductId ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock Movements</CardTitle>
            <CardDescription>Product ID: {selectedProductId}</CardDescription>
          </CardHeader>
          <CardContent>
            {stockMovements.length === 0 ? (
              <EmptyState title="No movement" description="Belum ada pergerakan stock." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <TableHead>Delta</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Created</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.map((row, index) => {
                    const item = row as Record<string, unknown>;
                    return (
                      <TableRow key={`${selectedProductId}-mv-${index}`}>
                        <TableCell>{String(item.delta ?? "-")}</TableCell>
                        <TableCell>{String(item.reason ?? "-")}</TableCell>
                        <TableCell>{String(item.stock_before ?? "-")}</TableCell>
                        <TableCell>{String(item.stock_after ?? "-")}</TableCell>
                        <TableCell>{formatDateTime((item.created_at as string) ?? null)}</TableCell>
                      </TableRow>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {stockModalProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeStockModal();
            }
          }}
        >
          <Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="stock-adjust-modal-title">
            <CardHeader>
              <CardTitle id="stock-adjust-modal-title">Adjust Stock</CardTitle>
              <CardDescription>
                Product: <span className="font-semibold text-slate-800">{stockModalProduct.title}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={onSubmitStockAdjustment}>
                <Input
                  label="Delta (boleh negatif)"
                  type="number"
                  value={stockDeltaInput}
                  onChange={(event) => setStockDeltaInput(event.target.value)}
                  required
                />
                <Input
                  label="Reason"
                  value={stockReasonInput}
                  onChange={(event) => setStockReasonInput(event.target.value)}
                  placeholder="manual_adjustment"
                  required
                />
                {requiresStockSafetyConfirmation(Math.trunc(asNumber(stockDeltaInput, 0))) ? (
                  <>
                    <Alert variant="info">
                      Adjustment sensitif terdeteksi (delta negatif atau sangat besar). Konfirmasi cepat diperlukan.
                    </Alert>
                    <label className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={stockConfirmed}
                        onChange={(event) => setStockConfirmed(event.target.checked)}
                      />
                      Saya paham dampaknya dan ingin melanjutkan adjustment ini.
                    </label>
                  </>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" type="button" onClick={closeStockModal}>
                    Close
                  </Button>
                  <Button
                    type="submit"
                    variant={requiresStockSafetyConfirmation(Math.trunc(asNumber(stockDeltaInput, 0))) ? "danger" : "secondary"}
                    isLoading={stockSubmitting}
                    disabled={
                      requiresStockSafetyConfirmation(Math.trunc(asNumber(stockDeltaInput, 0))) &&
                      !stockConfirmed
                    }
                  >
                    Save Adjustment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {deleteModalProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteModalSubmitting) {
              closeDeleteModal();
            }
          }}
        >
          <Card className="w-full max-w-lg" role="dialog" aria-modal="true" aria-labelledby="product-delete-modal-title">
            <CardHeader>
              <CardTitle id="product-delete-modal-title">Delete Product</CardTitle>
              <CardDescription>
                Product: <span className="font-semibold text-slate-800">{deleteModalProduct.title}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="info">
                Product akan dihapus (soft delete) dari catalog admin.
              </Alert>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={deleteConfirmed} onChange={(event) => setDeleteConfirmed(event.target.checked)} />
                Saya konfirmasi hapus product ini
              </label>
              <Input
                label="Reason Delete"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="Alasan penghapusan product"
                required
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={deleteModalSubmitting}>
                  Close
                </Button>
                <Button type="button" variant="danger" onClick={() => void onDeleteProduct()} isLoading={deleteModalSubmitting}>
                  Delete Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
