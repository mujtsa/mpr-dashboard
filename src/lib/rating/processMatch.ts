import { calculateRating } from './ratingEngine';
import { updatePlayerRating } from '@/lib/db/players';
import { getMatchesByPlayer } from '@/lib/db/matches';
import { insertRatingHistory, upsertPlayerStats, upsertPartnerStats } from '@/lib/db/stats';
import { createServerClient } from '@/lib/supabase/server';
import type { Match, Player } from '@/types/database';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlayerRatingResult {
  id:          string;
  displayName: string;
  oldRating:   number;
  newRating:   number;
  delta:       number;
}

export interface ProcessMatchResult {
  player1: PlayerRatingResult;
  player2: PlayerRatingResult;
}

// ---------------------------------------------------------------------------
// Main processor
// ---------------------------------------------------------------------------

/**
 * Runs the full post-match workflow for both Milton players:
 *  1. Calculate new ratings via the engine (both players get the same delta)
 *  2. Update players.current_rating
 *  3. Insert rating_history entries
 *  4. Recompute and upsert player_summary_stats
 *  5. Recompute and upsert partner_summary_stats
 *
 * @param match   The newly-saved match row (already in the DB)
 * @param player1 Player 1 row captured BEFORE the match was saved
 * @param player2 Player 2 row captured BEFORE the match was saved
 */
export async function processMatch(
  match:   Match,
  player1: Player,
  player2: Player,
): Promise<ProcessMatchResult> {
  const seasonId = match.season_id;

  // ------------------------------------------------------------------
  // 1. Fetch all season matches for each player (for stats recompute).
  //    The match is already saved, so these include the current match.
  // ------------------------------------------------------------------
  const [allP1Matches, allP2Matches] = await Promise.all([
    getMatchesByPlayer(player1.id, seasonId),
    getMatchesByPlayer(player2.id, seasonId),
  ]);

  // ------------------------------------------------------------------
  // 2. Run the rating engine.
  //    Both players receive the same raw delta; clamping may differ if
  //    a player is near the rating floor or ceiling.
  // ------------------------------------------------------------------
  const p1Out = calculateRating({
    playerRating:  player1.current_rating,
    miltonScore:   match.milton_score,
    opponentScore: match.opponent_score,
  });

  const p2Out = calculateRating({
    playerRating:  player2.current_rating,
    miltonScore:   match.milton_score,
    opponentScore: match.opponent_score,
  });

  // ------------------------------------------------------------------
  // 3. Persist new ratings on the player rows
  // ------------------------------------------------------------------
  await Promise.all([
    updatePlayerRating(player1.id, p1Out.newRating),
    updatePlayerRating(player2.id, p2Out.newRating),
  ]);

  // ------------------------------------------------------------------
  // 4. Append rating_history entries
  //    Confidence is no longer calculated — stored as 'low' to satisfy
  //    the NOT NULL constraint; the column is kept for schema compatibility.
  // ------------------------------------------------------------------
  await Promise.all([
    insertRatingHistory({
      player_id:      player1.id,
      season_id:      seasonId,
      match_id:       match.id,
      week_number:    match.week_number,
      rating_before:  p1Out.oldRating,
      rating_after:   p1Out.newRating,
      matches_played: allP1Matches.length,
      confidence:     'low',
    }),
    insertRatingHistory({
      player_id:      player2.id,
      season_id:      seasonId,
      match_id:       match.id,
      week_number:    match.week_number,
      rating_before:  p2Out.oldRating,
      rating_after:   p2Out.newRating,
      matches_played: allP2Matches.length,
      confidence:     'low',
    }),
  ]);

  // ------------------------------------------------------------------
  // 5. Recompute player_summary_stats for both players
  // ------------------------------------------------------------------
  await Promise.all([
    upsertPlayerSeasonStats(player1, p1Out.newRating, allP1Matches, seasonId),
    upsertPlayerSeasonStats(player2, p2Out.newRating, allP2Matches, seasonId),
  ]);

  // ------------------------------------------------------------------
  // 6. Recompute partner_summary_stats for this pair
  // ------------------------------------------------------------------
  await upsertPairStats(player1.id, player2.id, seasonId);

  // ------------------------------------------------------------------
  // 7. Return the result for the success message
  // ------------------------------------------------------------------
  return {
    player1: {
      id:          player1.id,
      displayName: player1.display_name,
      oldRating:   p1Out.oldRating,
      newRating:   p1Out.newRating,
      delta:       p1Out.delta,
    },
    player2: {
      id:          player2.id,
      displayName: player2.display_name,
      oldRating:   p2Out.oldRating,
      newRating:   p2Out.newRating,
      delta:       p2Out.delta,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MatchLike = {
  result:         string;
  match_date:     string;
  player_1_id:    string;
  player_2_id:    string;
  milton_score:   number;
  opponent_score: number;
};

async function upsertPlayerSeasonStats(
  player:    Player,
  newRating: number,
  matches:   MatchLike[],
  seasonId:  string,
) {
  const wins              = matches.filter(m => m.result === 'win').length;
  const losses            = matches.filter(m => m.result === 'loss').length;
  const streak            = computeStreak(matches);
  const bestPId           = findBestPartnerId(matches, player.id);
  const totalPointsWon    = matches.reduce((s, m) => s + m.milton_score,   0);
  const totalPointsPlayed = matches.reduce((s, m) => s + m.milton_score + m.opponent_score, 0);

  await upsertPlayerStats({
    player_id:           player.id,
    season_id:           seasonId,
    wins,
    losses,
    matches_played:      matches.length,
    starting_rating:     player.starting_rating,
    current_rating:      newRating,
    confidence:          'low',
    best_partner_id:     bestPId,
    current_streak:      streak,
    total_points_won:    totalPointsWon,
    total_points_played: totalPointsPlayed,
  });
}

async function upsertPairStats(
  playerIdA: string,
  playerIdB: string,
  seasonId:  string,
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .select('result, milton_score, opponent_score')
    .eq('season_id', seasonId)
    .or(
      `and(player_1_id.eq.${playerIdA},player_2_id.eq.${playerIdB}),` +
      `and(player_1_id.eq.${playerIdB},player_2_id.eq.${playerIdA})`,
    );

  if (error) throw new Error(`upsertPairStats query: ${error.message}`);

  const rows           = data ?? [];
  const wins           = rows.filter(r => r.result === 'win').length;
  const losses         = rows.filter(r => r.result === 'loss').length;
  const points_for     = rows.reduce((s, r) => s + (r.milton_score   as number), 0);
  const points_against = rows.reduce((s, r) => s + (r.opponent_score as number), 0);

  await upsertPartnerStats({
    season_id:      seasonId,
    player_1_id:    playerIdA,
    player_2_id:    playerIdB,
    wins,
    losses,
    points_for,
    points_against,
  });
}

/** Positive = current win-streak length, negative = current loss-streak length. */
function computeStreak(matches: MatchLike[]): number {
  if (matches.length === 0) return 0;
  const sorted = [...matches].sort(
    (a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime(),
  );
  const first = sorted[0].result;
  if (first === 'tie') return 0;
  let count = 0;
  for (const m of sorted) {
    if (m.result === first) count++;
    else break;
  }
  return first === 'win' ? count : -count;
}

/**
 * Returns the top partnership partner id using canonical ranking:
 *   1. Win % (highest)  2. Point diff (highest)
 *   3. Avg conceded (lowest)  4. Matches played (most)
 * Minimum 2 shared matches required.
 */
function findBestPartnerId(matches: MatchLike[], playerId: string): string | null {
  const tally: Record<string, { wins: number; total: number; pf: number; pa: number }> = {};
  for (const m of matches) {
    const pid = m.player_1_id === playerId ? m.player_2_id : m.player_1_id;
    if (!tally[pid]) tally[pid] = { wins: 0, total: 0, pf: 0, pa: 0 };
    tally[pid].total++;
    tally[pid].pf += m.milton_score;
    tally[pid].pa += m.opponent_score;
    if (m.result === 'win') tally[pid].wins++;
  }
  const eligible = Object.entries(tally).filter(([, v]) => v.total >= 2);
  if (eligible.length === 0) return null;
  eligible.sort(([, a], [, b]) => {
    const aW = a.wins / a.total, bW = b.wins / b.total;
    if (Math.abs(bW - aW) > 0.0001) return bW - aW;
    const aDiff = a.pf - a.pa, bDiff = b.pf - b.pa;
    if (aDiff !== bDiff) return bDiff - aDiff;
    const aA = a.pa / a.total, bA = b.pa / b.total;
    if (Math.abs(aA - bA) > 0.001) return aA - bA;
    return b.total - a.total;
  });
  return eligible[0][0];
}
