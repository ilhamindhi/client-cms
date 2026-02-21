import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
};

export default function EmptyState({ icon, title, description }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-white px-6 py-10 text-center">
      {icon ? <div className="mx-auto mb-3 flex justify-center text-slate-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
