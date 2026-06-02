export function StatTile({
  label,
  value,
  sub,
  valueClass = 'text-white',
}: {
  label:       string;
  value:       React.ReactNode;
  sub?:        React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface rounded-lg p-3 space-y-0.5">
      <p className="text-xs text-slate-500 uppercase tracking-wide leading-none">{label}</p>
      <p className={`text-xl font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      {sub !== undefined && <p className="text-xs text-slate-500 leading-none">{sub}</p>}
    </div>
  );
}

export function SmallStatTile({
  label,
  value,
  valueClass = 'text-white',
}: {
  label:       string;
  value:       React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}
