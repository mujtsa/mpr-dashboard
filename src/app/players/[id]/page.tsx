import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TrendingUp, ClipboardList } from 'lucide-react';
import { getPlayerProfileData } from '@/lib/db/player-profile';
import { RATING_CONFIG } from '@/lib/rating/ratingConfig';
import { StatTile, SmallStatTile } from '@/components/players/profile/StatTile';
import RecentFormDots   from '@/components/players/profile/RecentFormDots';
import RatingTrendChart from '@/components/players/profile/RatingTrendChart';
import MatchHistoryClient from '@/components/players/profile/MatchHistoryClient';

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPlayerProfileData(id);
  return { title: data?.player.display_name ?? 'Player Profile' };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const data = await getPlayerProfileData(id);
  if (!data) notFound();

  const {
    player,
    activeSeason,
    seasonStats,
    overallRecord,
    chartData,
    matches,
    ratingChangeByMatchId,
    topPartnershipName,
    topPartnershipRecord,
    longestWinStreak,
    longestLossStreak,
    recentForm,
    winPercentage,
  } = data;

  const mp         = seasonStats?.matches_played ?? 0;
  const hasMatches = mp > 0;

  // Division baseline for chart reference line
  const baseline  = RATING_CONFIG.DIVISION_BASELINES[
    player.initial_division as keyof typeof RATING_CONFIG.DIVISION_BASELINES
  ] ?? Number(player.starting_rating);

  const GENDER_LABEL: Record<string, string> = { M: 'Male', F: 'Female' };
  const GENDER_STYLE: Record<string, string> = {
    M: 'bg-blue-950 text-blue-400 border border-blue-900',
    F: 'bg-fuchsia-950 text-fuchsia-400 border border-fuchsia-900',
  };

  const ratingChange = seasonStats ? Number(seasonStats.rating_change) : 0;

  // Avg Points Won %
  const tpw = seasonStats?.total_points_won    ?? 0;
  const tpp = seasonStats?.total_points_played ?? 0;
  const avgPointsWonPct = tpp > 0 ? (Math.round((tpw / tpp) * 1000) / 10) : null;

  // Streak display
  const streak = seasonStats?.current_streak ?? 0;
  const streakLabel = streak === 0 ? '—'
    : streak > 0 ? `${streak}W`
    : `${Math.abs(streak)}L`;
  const streakClass = streak > 0 ? 'text-emerald-400' : streak < 0 ? 'text-red-400' : 'text-slate-500';

  // Rating change display
  const changeLabel = !hasMatches ? '—'
    : ratingChange > 0 ? `+${ratingChange.toFixed(2)}`
    : ratingChange < 0 ? ratingChange.toFixed(2)
    : '±0.00';
  const changeClass = ratingChange > 0 ? 'text-emerald-400' : ratingChange < 0 ? 'text-red-400' : 'text-slate-500';

  // Record helpers
  function record(w: number, l: number, played: number) {
    if (played === 0) return '—';
    return `${w}W · ${l}L`;
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Hero card ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-5 sm:p-6 space-y-5">

        {/* Name + badges + rating */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{player.display_name}</h1>
            <div className="flex items-center flex-wrap gap-2 mt-2">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${GENDER_STYLE[player.gender]}`}>
                {GENDER_LABEL[player.gender]}
              </span>
              <span className="text-xs text-slate-500 font-mono bg-surface px-2 py-0.5 rounded">
                {player.initial_division}
              </span>
              {activeSeason && (
                <span className="text-xs text-slate-500">{activeSeason.name}</span>
              )}
            </div>
          </div>

          <p className="text-4xl font-bold text-white tabular-nums leading-none shrink-0">
            {Number(player.current_rating).toFixed(2)}
          </p>
        </div>

        {/* Primary stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatTile label="Starting Rating" value={Number(player.starting_rating).toFixed(2)} />
          <StatTile label="Season Change"   value={changeLabel} valueClass={changeClass} />
          <StatTile label="Season Record"   value={record(seasonStats?.wins ?? 0, seasonStats?.losses ?? 0, mp)} />
          <StatTile label="Overall Record"  value={record(overallRecord.wins, overallRecord.losses, overallRecord.wins + overallRecord.losses)} />
          <StatTile label="Win %"           value={winPercentage != null ? `${winPercentage}%` : '—'} />
          <StatTile
            label="Avg Points Won"
            value={avgPointsWonPct != null ? `${avgPointsWonPct}%` : 'N/A'}
            valueClass={avgPointsWonPct != null && avgPointsWonPct >= 50 ? 'text-emerald-400' : avgPointsWonPct != null ? 'text-red-400' : 'text-slate-500'}
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <SmallStatTile
            label="Current Streak"
            value={streakLabel}
            valueClass={streakClass}
          />
          <SmallStatTile
            label="Longest Win Streak"
            value={longestWinStreak > 0 ? `${longestWinStreak}W` : '—'}
            valueClass={longestWinStreak > 0 ? 'text-emerald-400' : 'text-slate-500'}
          />
          <SmallStatTile
            label="Longest Loss Streak"
            value={longestLossStreak > 0 ? `${longestLossStreak}L` : '—'}
            valueClass={longestLossStreak > 0 ? 'text-red-400' : 'text-slate-500'}
          />
          <SmallStatTile
            label="Top Partnership"
            value={
              topPartnershipName
                ? `${topPartnershipName}${topPartnershipRecord ? ` · ${topPartnershipRecord}` : ''}`
                : '—'
            }
            valueClass={topPartnershipName ? 'text-white' : 'text-slate-500'}
          />
        </div>

        {/* Recent form */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-slate-500 uppercase tracking-wide shrink-0">
            Recent form
          </span>
          <RecentFormDots form={recentForm} />
        </div>
      </div>

      {/* ── Rating Trend ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Rating Trend</h2>
        </div>
        <RatingTrendChart
          data={chartData}
          startingRating={Number(player.starting_rating)}
          divisionBaseline={baseline}
        />
      </div>

      {/* ── Match History ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList size={15} className="text-brand-400" />
          <h2 className="text-sm font-semibold text-white">Match History</h2>
          {matches.length > 0 && (
            <span className="ml-auto text-xs text-slate-500 bg-surface px-2 py-0.5 rounded-full">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
        <MatchHistoryClient
          matches={matches}
          playerId={player.id}
          ratingChangeByMatchId={ratingChangeByMatchId}
        />
      </div>

    </div>
  );
}
