import Link from 'next/link';
import type { PlayerListItem } from '@/lib/db/players';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GENDER_STYLES: Record<string, string> = {
  M: 'bg-blue-950 text-blue-400 border border-blue-900',
  F: 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-900',
};

const GENDER_LABELS: Record<string, string> = {
  M: 'Male',
  F: 'Female',
};

function SeasonChange({ change, played }: { change: number; played: number }) {
  if (played === 0) return <span className="text-slate-600">—</span>;
  if (change > 0)   return <span className="text-emerald-400 font-semibold">+{change.toFixed(2)}</span>;
  if (change < 0)   return <span className="text-red-400 font-semibold">{change.toFixed(2)}</span>;
  return <span className="text-slate-500">±0.00</span>;
}

function Record({ wins, losses, played }: { wins: number; losses: number; played: number }) {
  if (played === 0) return <span className="text-slate-600">—</span>;
  return (
    <span>
      <span className="text-emerald-400 font-semibold">{wins}W</span>
      <span className="text-slate-600 mx-1">·</span>
      <span className="text-red-400">{losses}L</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export default function PlayerCard({ player }: { player: PlayerListItem }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="block rounded-xl border border-surface-border bg-surface-card hover:border-brand-600 hover:bg-surface-card/80 transition-colors"
    >
      {/* Top row: name + rating (no confidence badge) */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white truncate">{player.display_name}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GENDER_STYLES[player.gender]}`}>
              {GENDER_LABELS[player.gender]}
            </span>
            <span className="text-xs text-slate-500 font-mono">{player.initial_division}</span>
          </div>
        </div>

        <p className="text-2xl font-bold text-white tabular-nums leading-none shrink-0">
          {player.current_rating.toFixed(2)}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-border/60 mx-5" />

      {/* Stats row */}
      <div className="px-5 py-3 grid grid-cols-3 gap-x-4 text-sm">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Season</p>
          <Record wins={player.season_wins} losses={player.season_losses} played={player.matches_played} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Change</p>
          <SeasonChange change={player.season_change} played={player.matches_played} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Avg Pts</p>
          <span className="text-white tabular-nums">
            {player.avg_points_won_pct != null ? `${player.avg_points_won_pct}%` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Bottom info row: top partnership + overall record */}
      <div className="px-5 pb-4 flex items-center justify-between gap-2 flex-wrap">
        {player.top_partnership_name ? (
          <p className="text-xs text-slate-500">
            Top partnership ·{' '}
            <span className="text-slate-300">{player.top_partnership_name}</span>
            {player.top_partnership_record && (
              <span className="text-slate-400 ml-1.5 tabular-nums">{player.top_partnership_record}</span>
            )}
          </p>
        ) : (
          <span />
        )}
        <p className="text-xs text-slate-500 tabular-nums shrink-0">
          {player.overall_wins + player.overall_losses > 0
            ? `${player.overall_wins}W · ${player.overall_losses}L overall`
            : ''}
        </p>
      </div>
    </Link>
  );
}
