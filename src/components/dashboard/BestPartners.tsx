import { Users } from 'lucide-react';
import DashboardSection, { EmptySection } from './DashboardSection';
import type { PartnerStatWithNames } from '@/lib/db/dashboard';

function winPct(wins: number, played: number): string {
  if (played === 0) return '—';
  return `${Math.round((wins / played) * 100)}%`;
}

export default function TopPartnerships({ data }: { data: PartnerStatWithNames[] }) {
  return (
    <DashboardSection icon={Users} title="Top Partnerships (Min. 2 Matches)">
      {data.length === 0 ? (
        <EmptySection message="Partner stats will appear after matches are entered." />
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
                <th className="text-left pb-2 font-medium">Partnership</th>
                <th className="text-center pb-2 font-medium">Record</th>
                <th className="text-right pb-2 font-medium">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {data.map(p => (
                <tr key={p.id}>
                  <td className="py-2.5 text-white font-medium">
                    {p.player_1.display_name}
                    <span className="text-slate-500 mx-1.5">&amp;</span>
                    {p.player_2.display_name}
                  </td>
                  <td className="py-2.5 text-center tabular-nums text-slate-300">
                    {p.wins}-{p.losses}
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-semibold text-white">
                    {winPct(p.wins, p.matches_played)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile stacked cards */}
          <div className="sm:hidden divide-y divide-surface-border/50">
            {data.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-white font-medium truncate">
                  {p.player_1.display_name} &amp; {p.player_2.display_name}
                </p>
                <div className="flex items-center gap-3 text-sm shrink-0 ml-2">
                  <span className="text-slate-300 tabular-nums">{p.wins}-{p.losses}</span>
                  <span className="text-white font-semibold tabular-nums">
                    {winPct(p.wins, p.matches_played)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardSection>
  );
}
