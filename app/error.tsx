"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/lib/hooks/use-toast";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const toast = useToast();

  useEffect(() => {
    console.error("Global app error:", error);
    toast.error({
      title: "Unexpected error",
      message: "Terjadi error tidak terduga. Silakan coba lagi.",
      durationMs: 6000,
    });
  }, [error, toast]);

  return (
    <div className="grid min-h-screen place-content-center px-4">
      <div className="panel max-w-lg rounded-xl p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 text-[var(--color-danger)]" size={30} />
        <h2 className="text-lg font-bold text-slate-900">Terjadi Kesalahan</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aplikasi mengalami kendala sementara. Coba muat ulang halaman.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/auth/login";
            }}
          >
            Ke Login
          </Button>
          <Button
            onClick={() => {
              reset();
            }}
          >
            Coba Lagi
          </Button>
        </div>
        {error.digest ? <p className="mt-4 text-xs text-slate-500">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}
