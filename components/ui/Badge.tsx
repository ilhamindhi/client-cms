import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "danger" | "warning" | "info";

const variantClasses: Record<Variant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger-dark)]",
  warning: "bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]",
  info: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
};

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

export default function Badge({ children, variant = "default", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
