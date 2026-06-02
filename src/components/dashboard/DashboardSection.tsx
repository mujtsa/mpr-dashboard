import type { LucideIcon } from 'lucide-react';

interface Props {
  icon:      LucideIcon;
  title:     string;
  badge?:    string;
  children:  React.ReactNode;
}

export default function DashboardSection({ icon: Icon, title, badge, children }: Props) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-brand-400 shrink-0" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        {badge && (
          <span className="text-xs text-slate-500 bg-surface px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </div>
  );
}

export function EmptySection({ message }: { message: string }) {
  return (
    <p className="text-sm text-slate-500 text-center py-6">{message}</p>
  );
}
