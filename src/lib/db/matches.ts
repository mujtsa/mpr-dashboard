import { createServerClient } from '@/lib/supabase/server';
import type { Match, MatchInsert, Player } from '@/types/database';

// ---------------------------------------------------------------------------
// Extended type: match row with player display names joined in
// ---------------------------------------------------------------------------
export interface MatchWithPlayers extends Match {
  player_1: Pick<Player, 'id' | 'display_name' | 'current_rating'>;
  player_2: Pick<Player, 'id' | 'display_name' | 'current_rating'>;
}

const MATCH_WITH_PLAYERS_QUERY = `
  *,
  player_1:players!player_1_id(id, display_name, current_rating),
  player_2:players!player_2_id(id, display_name, current_rating)
` as const;

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

/** All matches for a season, newest first. */
export async function getMatchesBySeason(seasonId: string): Promise<MatchWithPlayers[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_PLAYERS_QUERY)
    .eq('season_id', seasonId)
    .order('match_date', { ascending: false });

  if (error) throw new Error(`getMatchesBySeason: ${error.message}`);
  return (data ?? []) as MatchWithPlayers[];
}

/** All matches for a specific week in a season. */
export async function getMatchesByWeek(
  seasonId: string,
  weekNumber: number,
): Promise<MatchWithPlayers[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_PLAYERS_QUERY)
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber)
    .order('match_date', { ascending: false });

  if (error) throw new Error(`getMatchesByWeek: ${error.message}`);
  return (data ?? []) as MatchWithPlayers[];
}

/**
 * All matches for a player in a season.
 * Checks both player_1_id and player_2_id columns.
 */
export async function getMatchesByPlayer(
  playerId: string,
  seasonId: string,
): Promise<MatchWithPlayers[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_PLAYERS_QUERY)
    .eq('season_id', seasonId)
    .or(`player_1_id.eq.${playerId},player_2_id.eq.${playerId}`)
    .order('match_date', { ascending: false });

  if (error) throw new Error(`getMatchesByPlayer: ${error.message}`);
  return (data ?? []) as MatchWithPlayers[];
}

/** Most recent N matches in a season (for the dashboard feed). */
export async function getRecentMatches(
  seasonId: string,
  limit = 10,
): Promise<MatchWithPlayers[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_WITH_PLAYERS_QUERY)
    .eq('season_id', seasonId)
    .order('match_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentMatches: ${error.message}`);
  return (data ?? []) as MatchWithPlayers[];
}

/** Count of matches a player has played in a season (for confidence calculation). */
export async function getMatchCountForPlayer(
  playerId: string,
  seasonId: string,
): Promise<number> {
  const supabase = createServerClient();
  const { count, error } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .or(`player_1_id.eq.${playerId},player_2_id.eq.${playerId}`);

  if (error) throw new Error(`getMatchCountForPlayer: ${error.message}`);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Write queries
// ---------------------------------------------------------------------------

/** Inserts a single match. Returns the created row (without joined players). */
export async function createMatch(input: MatchInsert): Promise<Match> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`createMatch: ${error.message}`);
  return data;
}

/** Inserts multiple matches in one round-trip (for batch/CSV upload). */
export async function createMatchesBatch(inputs: MatchInsert[]): Promise<Match[]> {
  if (inputs.length === 0) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('matches')
    .insert(inputs)
    .select();

  if (error) throw new Error(`createMatchesBatch: ${error.message}`);
  return data ?? [];
}
