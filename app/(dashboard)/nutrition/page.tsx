"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Utensils } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Table, { TableCell, TableHead, TableRow } from "@/components/ui/Table";
import {
  createFoodCatalogItemAdmin,
  deleteFoodCatalogItemAdmin,
  listFoodCatalogAdmin,
  type NutritionFoodItem,
  updateFoodCatalogItemAdmin,
} from "@/lib/api/nutrition";
import { useFeedbackToast } from "@/lib/hooks/use-feedback-toast";
import { useAuthStore } from "@/lib/stores/auth-store";
import { formatDateTime } from "@/lib/utils";

type VerifyFilter = "all" | "verified" | "unverified";

type FoodForm = {
  name: string;
  brand: string;
  serving_size: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  source: string;
  is_verified: boolean;
};

const initialFoodForm: FoodForm = {
  name: "",
  brand: "",
  serving_size: "",
  calories: "0",
  protein_g: "0",
  carbs_g: "0",
  fat_g: "0",
  fiber_g: "0",
  source: "manual",
  is_verified: false,
};

const selectClassName =
  "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

function asNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function asOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapItemToForm(item: NutritionFoodItem): FoodForm {
  return {
    name: String(item.name ?? ""),
    brand: String(item.brand ?? ""),
    serving_size: String(item.serving_size ?? ""),
    calories: String(item.calories ?? 0),
    protein_g: String(item.protein_g ?? 0),
    carbs_g: String(item.carbs_g ?? 0),
    fat_g: String(item.fat_g ?? 0),
    fiber_g: String(item.fiber_g ?? 0),
    source: String(item.source ?? "manual"),
    is_verified: Boolean(item.is_verified),
  };
}

export default function NutritionPage() {
  const { accessToken, hasRole } = useAuthStore();
  const hasAdminAccess = hasRole("admin") || hasRole("superadmin");

  const [foods, setFoods] = useState<NutritionFoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [editModalSaving, setEditModalSaving] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>("all");
  const [limit, setLimit] = useState("100");

  const [createForm, setCreateForm] = useState<FoodForm>(initialFoodForm);
  const [editModal, setEditModal] = useState<{ id: string; form: FoodForm } | null>(null);

  useFeedbackToast({
    error: pageError,
    success: pageMessage,
    errorTitle: "Nutrition",
    successTitle: "Nutrition",
  });

  const visibleFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return foods;
    }
    return foods.filter((item) => {
      const name = String(item.name ?? "").toLowerCase();
      const brand = String(item.brand ?? "").toLowerCase();
      const source = String(item.source ?? "").toLowerCase();
      return name.includes(q) || brand.includes(q) || source.includes(q);
    });
  }, [foods, query]);

  async function loadFoods() {
    if (!accessToken || !hasAdminAccess) {
      return;
    }

    setLoading(true);
    setPageError(null);
    try {
      const isVerified =
        verifyFilter === "all" ? undefined : verifyFilter === "verified";
      const rows = await listFoodCatalogAdmin(accessToken, {
        q: query.trim() || undefined,
        is_verified: isVerified,
        limit: Math.max(1, Math.floor(asNumber(limit, 100))),
      });
      setFoods(rows);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load food catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, hasAdminAccess, verifyFilter]);

  async function onCreateFood(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    setSavingCreate(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await createFoodCatalogItemAdmin(accessToken, {
        name: createForm.name.trim(),
        brand: asOptionalText(createForm.brand),
        serving_size: asOptionalText(createForm.serving_size),
        calories: asNumber(createForm.calories, 0),
        protein_g: asNumber(createForm.protein_g, 0),
        carbs_g: asNumber(createForm.carbs_g, 0),
        fat_g: asNumber(createForm.fat_g, 0),
        fiber_g: asNumber(createForm.fiber_g, 0),
        source: asOptionalText(createForm.source) ?? "manual",
        is_verified: createForm.is_verified,
      });
      setCreateForm(initialFoodForm);
      setPageMessage("Food catalog item created.");
      await loadFoods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to create food catalog item");
    } finally {
      setSavingCreate(false);
    }
  }

  function onOpenEditFoodModal(item: NutritionFoodItem) {
    setEditModal({
      id: item.id,
      form: mapItemToForm(item),
    });
  }

  function closeEditFoodModal() {
    setEditModal(null);
  }

  async function onSaveEditFoodModal() {
    if (!accessToken || !editModal) return;

    setEditModalSaving(true);
    setPageError(null);
    setPageMessage(null);
    try {
      await updateFoodCatalogItemAdmin(accessToken, editModal.id, {
        name: editModal.form.name.trim(),
        brand: asOptionalText(editModal.form.brand),
        serving_size: asOptionalText(editModal.form.serving_size),
        calories: asNumber(editModal.form.calories, 0),
        protein_g: asNumber(editModal.form.protein_g, 0),
        carbs_g: asNumber(editModal.form.carbs_g, 0),
        fat_g: asNumber(editModal.form.fat_g, 0),
        fiber_g: asNumber(editModal.form.fiber_g, 0),
        source: asOptionalText(editModal.form.source) ?? "manual",
        is_verified: editModal.form.is_verified,
      });
      setPageMessage(`Food item ${editModal.id} updated.`);
      setEditModal(null);
      await loadFoods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update food catalog item");
    } finally {
      setEditModalSaving(false);
    }
  }

  async function onToggleVerification(item: NutritionFoodItem) {
    if (!accessToken) return;

    setRowActionId(item.id);
    setPageError(null);
    setPageMessage(null);
    try {
      await updateFoodCatalogItemAdmin(accessToken, item.id, {
        is_verified: !item.is_verified,
      });
      setPageMessage(`Food item ${item.name} ${item.is_verified ? "unverified" : "verified"}.`);
      await loadFoods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update verification status");
    } finally {
      setRowActionId(null);
    }
  }

  async function onDeleteFood(item: NutritionFoodItem) {
    if (!accessToken) return;

    setRowActionId(item.id);
    setPageError(null);
    setPageMessage(null);
    try {
      await deleteFoodCatalogItemAdmin(accessToken, item.id);
      if (editModal?.id === item.id) {
        setEditModal(null);
      }
      setPageMessage(`Food item ${item.name} deleted.`);
      await loadFoods();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to delete food catalog item");
    } finally {
      setRowActionId(null);
    }
  }

  if (!hasAdminAccess) {
    return (
      <EmptyState
        icon={<Utensils size={28} />}
        title="Admin only"
        description="Halaman nutrition hanya untuk role admin atau superadmin."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nutrition Food Catalog</CardTitle>
          <CardDescription>Kelola food catalog untuk fitur nutrition (create, verify, update, delete).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <Input
              label="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="food name / brand / source"
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Verification</span>
              <select
                className={selectClassName}
                value={verifyFilter}
                onChange={(event) => setVerifyFilter(event.target.value as VerifyFilter)}
              >
                <option value="all">all</option>
                <option value="verified">verified</option>
                <option value="unverified">unverified</option>
              </select>
            </label>
            <Input
              label="Limit"
              type="number"
              min="1"
              max="200"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void loadFoods()}
                isLoading={loading}
                leftIcon={<RefreshCw size={16} />}
              >
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
          <CardTitle>Create Food Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-3 lg:grid-cols-3" onSubmit={onCreateFood}>
            <Input
              label="Name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <Input
              label="Brand (Optional)"
              value={createForm.brand}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, brand: event.target.value }))}
            />
            <Input
              label="Serving Size (Optional)"
              value={createForm.serving_size}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, serving_size: event.target.value }))
              }
              placeholder="100g"
            />
            <Input
              label="Calories"
              type="number"
              min="0"
              value={createForm.calories}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, calories: event.target.value }))}
              required
            />
            <Input
              label="Protein (g)"
              type="number"
              min="0"
              value={createForm.protein_g}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, protein_g: event.target.value }))
              }
              required
            />
            <Input
              label="Carbs (g)"
              type="number"
              min="0"
              value={createForm.carbs_g}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, carbs_g: event.target.value }))}
              required
            />
            <Input
              label="Fat (g)"
              type="number"
              min="0"
              value={createForm.fat_g}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, fat_g: event.target.value }))}
              required
            />
            <Input
              label="Fiber (g)"
              type="number"
              min="0"
              value={createForm.fiber_g}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, fiber_g: event.target.value }))}
              required
            />
            <Input
              label="Source"
              value={createForm.source}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, source: event.target.value }))}
              required
            />
            <label className="flex items-center gap-2 pt-7 text-sm text-slate-700 lg:col-span-3">
              <input
                type="checkbox"
                checked={createForm.is_verified}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, is_verified: event.target.checked }))
                }
              />
              Mark as verified
            </label>
            <div className="lg:col-span-3">
              <Button type="submit" isLoading={savingCreate}>
                Save Food Item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Food Catalog List</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleFoods.length === 0 && !loading ? (
            <EmptyState title="No food items" description="Belum ada data food catalog." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TableHead>Food</TableHead>
                  <TableHead>Serving</TableHead>
                  <TableHead>Macros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody>
                {visibleFoods.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.brand || "-"}</div>
                    </TableCell>
                    <TableCell>{item.serving_size || "-"}</TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-700">
                        C:{String(item.calories)} | P:{String(item.protein_g)} | Cb:{String(item.carbs_g)}
                      </div>
                      <div className="text-xs text-slate-500">
                        F:{String(item.fat_g)} | Fi:{String(item.fiber_g)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={item.is_verified ? "success" : "warning"}>
                          {item.is_verified ? "verified" : "unverified"}
                        </Badge>
                        <span className="text-xs text-slate-500">{item.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateTime(item.updated_at || item.created_at || null)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenEditFoodModal(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isLoading={rowActionId === item.id}
                          onClick={() => void onToggleVerification(item)}
                        >
                          {item.is_verified ? "Unverify" : "Verify"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          isLoading={rowActionId === item.id}
                          onClick={() => void onDeleteFood(item)}
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

      {editModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editModalSaving) {
              closeEditFoodModal();
            }
          }}
        >
          <Card className="w-full max-w-5xl max-h-[92vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="food-edit-modal-title">
            <CardHeader>
              <CardTitle id="food-edit-modal-title">Edit Food Item</CardTitle>
              <CardDescription>ID: {editModal.id}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Input
                label="Name"
                value={editModal.form.name}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, name: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Brand (Optional)"
                value={editModal.form.brand}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, brand: event.target.value },
                        }
                      : prev,
                  )
                }
              />
              <Input
                label="Serving Size (Optional)"
                value={editModal.form.serving_size}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, serving_size: event.target.value },
                        }
                      : prev,
                  )
                }
              />
              <Input
                label="Calories"
                type="number"
                min="0"
                value={editModal.form.calories}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, calories: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Protein (g)"
                type="number"
                min="0"
                value={editModal.form.protein_g}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, protein_g: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Carbs (g)"
                type="number"
                min="0"
                value={editModal.form.carbs_g}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, carbs_g: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Fat (g)"
                type="number"
                min="0"
                value={editModal.form.fat_g}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, fat_g: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Fiber (g)"
                type="number"
                min="0"
                value={editModal.form.fiber_g}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, fiber_g: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <Input
                label="Source"
                value={editModal.form.source}
                onChange={(event) =>
                  setEditModal((prev) =>
                    prev
                      ? {
                          ...prev,
                          form: { ...prev.form, source: event.target.value },
                        }
                      : prev,
                  )
                }
                required
              />
              <label className="flex items-center gap-2 pt-2 text-sm text-slate-700 lg:col-span-3">
                <input
                  type="checkbox"
                  checked={editModal.form.is_verified}
                  onChange={(event) =>
                    setEditModal((prev) =>
                      prev
                        ? {
                            ...prev,
                            form: { ...prev.form, is_verified: event.target.checked },
                          }
                        : prev,
                    )
                  }
                />
                Verified
              </label>
              <div className="flex justify-end gap-2 lg:col-span-3">
                <Button type="button" variant="ghost" onClick={closeEditFoodModal} disabled={editModalSaving}>
                  Close
                </Button>
                <Button type="button" onClick={() => void onSaveEditFoodModal()} isLoading={editModalSaving}>
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
