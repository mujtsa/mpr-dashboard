const DOT: Record<string, string> = {
  win:  'bg-emerald-400',
  loss: 'bg-red-400',
  tie:  'bg-slate-500',
};

const LABEL: Record<string, string> = {
  win:  'W',
  loss: 'L',
  tie:  'T',
};

export default function RecentFormDots({ form }: { form: string[] }) {
  if (form.length === 0) {
    return <span className="text-xs text-slate-600">No matches yet</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      {form.map((r, i) => (
        <div
          key={i}
          title={r.charAt(0).toUpperCase() + r.slice(1)}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-surface ${DOT[r] ?? 'bg-slate-600'}`}
        >
          {LABEL[r] ?? '?'}
        </div>
      ))}
    </div>
  );
}
