import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = HTMLAttributes<HTMLDivElement>;

export default function Skeleton({ className, ...props }: Props) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200/80", className)} {...props} />;
}
