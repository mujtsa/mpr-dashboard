import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function PlaceholderCard({ icon: Icon, title, description }: Props) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-brand-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="h-1.5 rounded-full bg-surface w-3/4 opacity-30" />
    </div>
  );
}
