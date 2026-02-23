"use client";

import { useToastStore } from "@/lib/stores/toast-store";

type PushToastOptions = {
  title?: string;
  message: string;
  durationMs?: number;
};

export function useToast() {
  const pushToast = useToastStore((state) => state.pushToast);

  return {
    info: ({ title, message, durationMs }: PushToastOptions) =>
      pushToast({
        title,
        message,
        durationMs,
        variant: "info",
      }),
    success: ({ title, message, durationMs }: PushToastOptions) =>
      pushToast({
        title,
        message,
        durationMs,
        variant: "success",
      }),
    error: ({ title, message, durationMs }: PushToastOptions) =>
      pushToast({
        title,
        message,
        durationMs,
        variant: "error",
      }),
  };
}
