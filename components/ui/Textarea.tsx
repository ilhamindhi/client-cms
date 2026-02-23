import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  labelClassName?: string;
  hint?: string;
  error?: string;
};

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, label, labelClassName, hint, error, ...props },
  ref,
) {
  return (
    <label className="block space-y-1.5">
      {label ? <span className={cn("text-sm font-medium text-slate-700", labelClassName)}>{label}</span> : null}
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:bg-slate-100",
          error
            ? "border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger-soft)]"
            : "",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--color-danger-dark)]">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-slate-500" data-ui="field-hint">{hint}</span> : null}
    </label>
  );
});

export default Textarea;
