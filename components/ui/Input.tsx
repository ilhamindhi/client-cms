import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  labelClassName?: string;
  hint?: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, labelClassName, hint, error, ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className={cn("text-sm font-medium text-slate-700", labelClassName)}>{label}</span> : null}
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-slate-100",
          error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

export default Input;
