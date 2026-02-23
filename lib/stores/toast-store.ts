"use client";

import { create } from "zustand";

export type ToastVariant = "info" | "success" | "error";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastStore = {
  toasts: ToastItem[];
  pushToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
};

function nextToastId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],
  pushToast: ({ title, message, variant = "info", durationMs = 4000 }) => {
    const id = nextToastId();
    const toast: ToastItem = {
      id,
      title,
      message,
      variant,
      durationMs,
    };

    set((state) => ({
      toasts: [...state.toasts, toast],
    }));

    if (durationMs > 0) {
      globalThis.setTimeout(() => {
        get().dismissToast(id);
      }, durationMs);
    }

    return id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
