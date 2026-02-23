import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="grid min-h-[40vh] place-content-center px-4">
      <div className="panel w-full max-w-sm rounded-xl p-6 text-center">
        <Loader2 className="mx-auto mb-3 animate-spin text-[var(--color-primary)]" size={24} />
        <h2 className="text-base font-semibold text-slate-900">Loading dashboard...</h2>
        <p className="mt-1 text-sm text-slate-600">Menyiapkan modul admin/superadmin.</p>
      </div>
    </div>
  );
}
