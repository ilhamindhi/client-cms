import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  labelClassName?: string;
  hint?: string;
  error?: string;
};

const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { className, label, labelClassName, hint, error, children, ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className={cn("text-sm font-medium text-slate-700", labelClassName)}>{label}</span> : null}
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-slate-100",
          error
            ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-soft)]"
            : "",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs text-[var(--color-danger-dark)]">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500" data-ui="field-hint">{hint}</span> : null}
    </label>
  );
});

export default Select;
