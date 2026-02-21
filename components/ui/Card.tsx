import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export default function Card({ className, children, ...props }: Props) {
  return (
    <div className={cn("panel rounded-xl", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: Props) {
  return (
    <div className={cn("border-b border-[var(--color-border)] px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: Props) {
  return (
    <h3 className={cn("text-lg font-bold text-slate-900", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: Props) {
  return (
    <p className={cn("mt-1 text-sm text-slate-500", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: Props) {
  return (
    <div className={cn("px-5 py-4", className)} {...props}>
      {children}
    </div>
  );
}
