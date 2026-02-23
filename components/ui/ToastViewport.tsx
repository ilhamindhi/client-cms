"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useToastStore, type ToastItem, type ToastVariant } from "@/lib/stores/toast-store";

const variantClasses: Record<ToastVariant, string> = {
  info: "border-slate-200 bg-white text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger-dark)]",
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return <CircleCheck size={16} className="shrink-0" />;
  }
  if (variant === "error") {
    return <CircleAlert size={16} className="shrink-0" />;
  }
  return <Info size={16} className="shrink-0" />;
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto w-full rounded-xl border px-3 py-2 shadow-lg ${variantClasses[toast.variant]}`}
    >
      <div className="flex items-start gap-2">
        <ToastIcon variant={toast.variant} />
        <div className="min-w-0 flex-1">
          {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
          <p className="text-sm">{toast.message}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-slate-500 transition hover:bg-slate-200/40 hover:text-slate-700"
          onClick={() => onDismiss(toast.id)}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] w-[min(90vw,360px)] space-y-2 sm:right-5 sm:top-5">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
