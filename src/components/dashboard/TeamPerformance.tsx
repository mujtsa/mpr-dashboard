import { Shield } from 'lucide-react';
import type { TeamPerformanceRow, DivisionRecord } from '@/lib/db/dashboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recordCls(r: DivisionRecord | undefined): string {
  if (!r) return 'text-slate-300';
  if (r.wins > r.losses) return 'text-emerald-400';
  if (r.losses > r.wins) return 'text-red-400';
  return 'text-slate-300';
}

function fmt(r: DivisionRecord) {
  return `${r.wins}-${r.losses}`;
}

// Desktop: table cell — blank if division not played
function RecordCell({ record }: { record?: DivisionRecord }) {
  if (!record) return <td className="px-3 py-2.5 text-center text-slate-700 text-xs">—</td>;
  return (
    <td className={`px-3 py-2.5 text-center tabular-nums font-medium ${recordCls(record)}`}>
      {fmt(record)}
    </td>
  );
}

// Mobile: small chip showing "4.0 · 4-8"
function DivisionChip({ label, record }: { label: string; record: DivisionRecord }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs tabular-nums ${recordCls(record)}`}>
      <span className="text-slate-500 font-normal">{label}</span>
      <span className="font-medium">{fmt(record)}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamPerformance({ rows }: { rows: TeamPerformanceRow[] }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Team Performance</h2>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Week · opponent · division record
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">
          Team performance will appear after matches are entered.
        </p>
      ) : (
        <>
          {/* ── Desktop table (md+) ───────────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
                  <th className="text-left px-5 py-2.5 font-medium whitespace-nowrap">Week</th>
                  <th className="text-left px-3 py-2.5 font-medium">Opponent</th>
                  <th className="text-center px-3 py-2.5 font-medium">4.0</th>
                  <th className="text-center px-3 py-2.5 font-medium">3.5+</th>
                  <th className="text-center px-3 py-2.5 font-medium">3.5−</th>
                  <th className="text-right px-5 py-2.5 font-medium whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-surface/40 transition-colors">
                    <td className="px-5 py-2.5 text-slate-400 tabular-nums whitespace-nowrap">
                      Wk {row.week_number}
                    </td>
                    <td className="px-3 py-2.5 text-white font-medium">
                      {row.opponent_club}
                    </td>
                    <RecordCell record={row.by_division['4.0']} />
                    <RecordCell record={row.by_division['3.5+']} />
                    <RecordCell record={row.by_division['3.5-']} />
                    <td className={`px-5 py-2.5 text-right tabular-nums font-semibold ${recordCls(row.total)}`}>
                      {fmt(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards (< md) ───────────────────────────────────── */}
          <div className="md:hidden divide-y divide-surface-border/50 px-4">
            {rows.map((row, i) => {
              const divChips = (
                ['4.0', '3.5+', '3.5-'] as const
              ).filter(d => row.by_division[d]);

              return (
                <div key={i} className="py-3 first:pt-4 last:pb-4 space-y-1.5">
                  {/* Row 1: Week + Opponent + Total */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
                        Wk {row.week_number}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {row.opponent_club}
                      </span>
                    </div>
                    <span className={`text-sm font-bold tabular-nums shrink-0 ${recordCls(row.total)}`}>
                      {fmt(row.total)}
                    </span>
                  </div>

                  {/* Row 2: Division breakdown chips */}
                  {divChips.length > 0 && (
                    <div className="flex items-center gap-3 pl-0.5">
                      {divChips.map(d => (
                        <DivisionChip
                          key={d}
                          label={d}
                          record={row.by_division[d]!}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
