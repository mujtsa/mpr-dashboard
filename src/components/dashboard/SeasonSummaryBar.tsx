import type { Season } from '@/types/database';
import type { SeasonSummary } from '@/lib/db/dashboard';

interface Props {
  season:  Season;
  summary: SeasonSummary;
}

export default function SeasonSummaryBar({ season, summary }: Props) {
  const stats = [
    { label: 'Players',  value: summary.totalPlayers  > 0 ? String(summary.totalPlayers)  : '—' },
    { label: 'Matches',  value: summary.totalMatches  > 0 ? String(summary.totalMatches)  : '—' },
    { label: 'Wins',     value: summary.totalWins     > 0 ? String(summary.totalWins)     : '—' },
    { label: 'Losses',   value: summary.totalLosses   > 0 ? String(summary.totalLosses)   : '—' },
    { label: 'Week',     value: summary.currentWeek   != null ? `${summary.currentWeek} of ${season.total_weeks}` : '—' },
  ];

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Season</p>
          <p className="text-sm font-semibold text-white mt-0.5">{season.name}</p>
        </div>

        <div className="hidden sm:block w-px h-8 bg-surface-border" />

        {stats.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
