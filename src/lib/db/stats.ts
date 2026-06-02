import { createServerClient } from '@/lib/supabase/server';
import type {
  PlayerSummaryStats,
  PlayerSummaryStatsInsert,
  PartnerSummaryStats,
  PartnerSummaryStatsInsert,
  RatingHistory,
  RatingHistoryInsert,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Player summary stats
// ---------------------------------------------------------------------------

/** Returns stats for one player in one season, or null. */
export async function getPlayerStats(
  playerId: string,
  seasonId: string,
): Promise<PlayerSummaryStats | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*')
    .eq('player_id', playerId)
    .eq('season_id', seasonId)
    .maybeSingle();

  if (error) throw new Error(`getPlayerStats: ${error.message}`);
  return data;
}

/** Returns stats for all players in a season, sorted by current rating desc. */
export async function getAllPlayerStats(seasonId: string): Promise<PlayerSummaryStats[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('current_rating', { ascending: false });

  if (error) throw new Error(`getAllPlayerStats: ${error.message}`);
  return data ?? [];
}

/** Most improved players: highest rating_change this season. */
export async function getMostImproved(
  seasonId: string,
  limit = 5,
): Promise<PlayerSummaryStats[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('rating_change', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getMostImproved: ${error.message}`);
  return data ?? [];
}

/** Best season records: highest win count with at least one match. */
export async function getBestRecords(
  seasonId: string,
  limit = 5,
): Promise<PlayerSummaryStats[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .gt('matches_played', 0)
    .order('wins', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getBestRecords: ${error.message}`);
  return data ?? [];
}

/**
 * Inserts or updates player stats for a season.
 * Uses (player_id, season_id) as the conflict target.
 */
export async function upsertPlayerStats(
  input: PlayerSummaryStatsInsert,
): Promise<PlayerSummaryStats> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .upsert(input, { onConflict: 'player_id,season_id' })
    .select()
    .single();

  if (error) throw new Error(`upsertPlayerStats: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Partner summary stats
// ---------------------------------------------------------------------------

/**
 * Returns stats for a specific pair in a season.
 * Enforces canonical ordering (smaller UUID = player_1).
 */
export async function getPartnerStats(
  playerIdA: string,
  playerIdB: string,
  seasonId: string,
): Promise<PartnerSummaryStats | null> {
  const [p1, p2] = canonical(playerIdA, playerIdB);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('partner_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .eq('player_1_id', p1)
    .eq('player_2_id', p2)
    .maybeSingle();

  if (error) throw new Error(`getPartnerStats: ${error.message}`);
  return data;
}

/** All partnerships for a player in a season. */
export async function getPartnerStatsForPlayer(
  playerId: string,
  seasonId: string,
): Promise<PartnerSummaryStats[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('partner_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .or(`player_1_id.eq.${playerId},player_2_id.eq.${playerId}`)
    .order('wins', { ascending: false });

  if (error) throw new Error(`getPartnerStatsForPlayer: ${error.message}`);
  return data ?? [];
}

/** Top partner combinations by wins in a season. */
export async function getBestPartners(
  seasonId: string,
  limit = 5,
): Promise<PartnerSummaryStats[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('partner_summary_stats')
    .select('*')
    .eq('season_id', seasonId)
    .order('wins', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getBestPartners: ${error.message}`);
  return data ?? [];
}

/**
 * Inserts or updates partner stats.
 * Enforces canonical ordering before upsert.
 */
export async function upsertPartnerStats(
  input: PartnerSummaryStatsInsert,
): Promise<PartnerSummaryStats> {
  const [p1, p2] = canonical(input.player_1_id, input.player_2_id);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('partner_summary_stats')
    .upsert(
      { ...input, player_1_id: p1, player_2_id: p2 },
      { onConflict: 'season_id,player_1_id,player_2_id' },
    )
    .select()
    .single();

  if (error) throw new Error(`upsertPartnerStats: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Rating history
// ---------------------------------------------------------------------------

/** Full rating history for a player in a season, oldest first (for trend chart). */
export async function getRatingHistory(
  playerId: string,
  seasonId: string,
): Promise<RatingHistory[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('rating_history')
    .select('*')
    .eq('player_id', playerId)
    .eq('season_id', seasonId)
    .order('recorded_at', { ascending: true });

  if (error) throw new Error(`getRatingHistory: ${error.message}`);
  return data ?? [];
}

/** Appends a single rating history entry. */
export async function insertRatingHistory(
  input: RatingHistoryInsert,
): Promise<RatingHistory> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('rating_history')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`insertRatingHistory: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Returns [smaller, larger] UUIDs to satisfy the canonical_order constraint. */
function canonical(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}
