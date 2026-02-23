"use client";

import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="grid min-h-screen place-content-center px-4">
        <div className="panel max-w-lg rounded-xl p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-[var(--color-danger)]" size={30} />
          <h2 className="text-lg font-bold text-slate-900">Global Error</h2>
          <p className="mt-1 text-sm text-slate-600">
            Terjadi kendala pada aplikasi. Silakan coba lagi.
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
      </body>
    </html>
  );
}
