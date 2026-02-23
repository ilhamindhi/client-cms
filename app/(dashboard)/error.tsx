"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/lib/hooks/use-toast";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const toast = useToast();

  useEffect(() => {
    console.error("Dashboard error:", error);
    toast.error({
      title: "Dashboard error",
      message: "Terjadi kendala saat memuat modul dashboard.",
      durationMs: 5000,
    });
  }, [error, toast]);

  return (
    <div className="grid min-h-[50vh] place-content-center px-4">
      <div className="panel max-w-lg rounded-xl p-6 text-center">
        <TriangleAlert className="mx-auto mb-3 text-[var(--color-danger)]" size={28} />
        <h2 className="text-lg font-bold text-slate-900">Dashboard Error</h2>
        <p className="mt-1 text-sm text-slate-600">
          Modul dashboard gagal dimuat. Kamu bisa coba lagi.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Kembali Dashboard
          </Button>
          <Button
            onClick={() => {
              reset();
            }}
          >
            Retry
          </Button>
        </div>
        {error.digest ? <p className="mt-4 text-xs text-slate-500">Ref: {error.digest}</p> : null}
      </div>
    </div>
  );
}
