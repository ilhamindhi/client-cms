import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "info" | "success" | "error";

type Props = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  role?: "alert" | "status";
};

const variantClasses: Record<AlertVariant, string> = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error:
    "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger-dark)]",
};

export default function Alert({ children, variant = "info", className, role }: Props) {
  const accessibilityRole = role || (variant === "error" ? "alert" : "status");

  return (
    <div
      role={accessibilityRole}
      aria-live={accessibilityRole === "alert" ? "assertive" : "polite"}
      className={cn("rounded-lg border px-3 py-2 text-sm", variantClasses[variant], className)}
    >
      {children}
    </div>
  );
}
