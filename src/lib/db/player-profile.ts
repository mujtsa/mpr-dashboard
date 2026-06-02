import { createServerClient } from '@/lib/supabase/server';
import { getPlayerById } from '@/lib/db/players';
import { getActiveSeason } from '@/lib/db/seasons';
import { getMatchesByPlayer } from '@/lib/db/matches';
import { getPlayerStats, getRatingHistory } from '@/lib/db/stats';
import type { Player, Season, PlayerSummaryStats, RatingHistory } from '@/types/database';
import type { MatchWithPlayers } from '@/lib/db/matches';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChartPoint {
  n:      number;   // 0 = start, 1…N = match sequence
  rating: number;
  week?:  number;
}

export interface PlayerProfileData {
  player:                 Player;
  activeSeason:           Season | null;
  seasonStats:            PlayerSummaryStats | null;
  overallRecord:          { wins: number; losses: number };
  ratingHistory:          RatingHistory[];
  chartData:              ChartPoint[];
  matches:                MatchWithPlayers[];
  ratingChangeByMatchId:  Record<string, number>;
  topPartnershipName:     string | null;
  topPartnershipRecord:   string | null;  // "5-1" format
  // Computed from match history
  longestWinStreak:       number;
  longestLossStreak:      number;
  recentForm:             string[];   // last 5 results, newest first
  winPercentage:          number | null;
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export async function getPlayerProfileData(
  playerId: string,
): Promise<PlayerProfileData | null> {
  const [player, activeSeason] = await Promise.all([
    getPlayerById(playerId),
    getActiveSeason(),
  ]);
  if (!player) return null;

  const supabase  = createServerClient();
  const seasonId  = activeSeason?.id;

  // ---- Parallel fetches --------------------------------------------------
  const [seasonStats, allTimeRes, ratingHistory, matches] =
    await Promise.all([
      seasonId ? getPlayerStats(playerId, seasonId)    : Promise.resolve(null),
      supabase.from('player_summary_stats').select('wins, losses').eq('player_id', playerId),
      seasonId ? getRatingHistory(playerId, seasonId)  : Promise.resolve([]),
      seasonId ? getMatchesByPlayer(playerId, seasonId): Promise.resolve([]),
    ]);

  // ---- Overall record ----------------------------------------------------
  const overallRecord = (allTimeRes.data ?? []).reduce(
    (acc, r) => ({ wins: acc.wins + (r.wins as number), losses: acc.losses + (r.losses as number) }),
    { wins: 0, losses: 0 },
  );

  // ---- Rating change map (match_id → change) for match history table -----
  const ratingChangeByMatchId: Record<string, number> = {};
  for (const rh of ratingHistory) {
    if (rh.match_id) ratingChangeByMatchId[rh.match_id] = Number(rh.rating_change);
  }

  // ---- Chart data --------------------------------------------------------
  const sortedHistory = [...ratingHistory].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
  );
  const chartData: ChartPoint[] = [
    { n: 0, rating: Number(player.starting_rating) },
    ...sortedHistory.map((rh, i) => ({
      n:      i + 1,
      rating: Number(rh.rating_after),
      week:   rh.week_number ?? undefined,
    })),
  ];

  // ---- Top partnership name + record ------------------------------------
  let topPartnershipName:   string | null = null;
  let topPartnershipRecord: string | null = null;

  const topPartnerId = seasonStats?.best_partner_id as string | null;
  if (topPartnerId && seasonId) {
    const [partnerPlayerRes, pairStatsRes] = await Promise.all([
      supabase.from('players').select('display_name').eq('id', topPartnerId).maybeSingle(),
      supabase
        .from('partner_summary_stats')
        .select('wins, losses')
        .eq('season_id', seasonId)
        .eq('player_1_id', [playerId, topPartnerId].sort()[0])
        .eq('player_2_id', [playerId, topPartnerId].sort()[1])
        .maybeSingle(),
    ]);
    topPartnershipName   = (partnerPlayerRes.data?.display_name as string) ?? null;
    const ps = pairStatsRes.data;
    if (ps) topPartnershipRecord = `${ps.wins}-${ps.losses}`;
  }

  // ---- Computed stats from match history --------------------------------
  const chronoMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
  );
  const recentForm = [...chronoMatches]
    .reverse()
    .slice(0, 5)
    .map(m => m.result);

  const longestWinStreak  = computeLongest(chronoMatches, 'win');
  const longestLossStreak = computeLongest(chronoMatches, 'loss');

  const mp = seasonStats?.matches_played ?? 0;
  const winPercentage = mp > 0
    ? Math.round(((seasonStats?.wins ?? 0) / mp) * 100)
    : null;

  return {
    player,
    activeSeason,
    seasonStats,
    overallRecord,
    ratingHistory,
    chartData,
    matches,
    ratingChangeByMatchId,
    topPartnershipName,
    topPartnershipRecord,
    longestWinStreak,
    longestLossStreak,
    recentForm,
    winPercentage,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function computeLongest(matches: { result: string }[], target: string): number {
  let longest = 0, current = 0;
  for (const m of matches) {
    if (m.result === target) { current++; longest = Math.max(longest, current); }
    else current = 0;
  }
  return longest;
}
