import Link from 'next/link';
import { Trophy } from 'lucide-react';
import DashboardSection, { EmptySection } from './DashboardSection';
import type { PlayerStatWithName } from '@/lib/db/dashboard';

function winPct(wins: number, played: number): string {
  if (played === 0) return '—';
  return `${Math.round((wins / played) * 100)}%`;
}

export default function BestWinPct({ data }: { data: PlayerStatWithName[] }) {
  return (
    <DashboardSection icon={Trophy} title="Best Win Percentage" badge="Min. 4 matches">
      {data.length === 0 ? (
        <EmptySection message="Win percentage will appear after matches are entered." />
      ) : (
        <>
          {/* Desktop table */}
          <table className="hidden sm:table w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-surface-border">
                <th className="text-left pb-2 font-medium">Player</th>
                <th className="text-center pb-2 font-medium">Record</th>
                <th className="text-right pb-2 font-medium">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/50">
              {data.map(p => (
                <tr key={p.player_id}>
                  <td className="py-2.5">
                    <Link href={`/players/${p.player_id}`}
                      className="text-white hover:text-brand-400 transition-colors font-medium">
                      {p.display_name}
                    </Link>
                  </td>
                  <td className="py-2.5 text-center text-slate-300 tabular-nums">
                    {p.wins}-{p.losses}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-white tabular-nums">
                    {winPct(p.wins, p.matches_played)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile stacked */}
          <div className="sm:hidden divide-y divide-surface-border/50">
            {data.map(p => (
              <div key={p.player_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <Link href={`/players/${p.player_id}`}
                  className="text-sm font-medium text-white hover:text-brand-400 transition-colors">
                  {p.display_name}
                </Link>
                <div className="flex items-center gap-2 text-sm shrink-0 ml-2 tabular-nums">
                  <span className="text-slate-300">{p.wins}-{p.losses}</span>
                  <span className="text-white font-semibold">{winPct(p.wins, p.matches_played)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardSection>
  );
}
