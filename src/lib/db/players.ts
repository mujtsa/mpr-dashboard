import { createServerClient } from '@/lib/supabase/server';
import type { Player, PlayerInsert, Division } from '@/types/database';

// ---------------------------------------------------------------------------
// Enriched type used by the Players list page
// ---------------------------------------------------------------------------

export interface PlayerListItem {
  id:                       string;
  display_name:             string;
  gender:                   'M' | 'F';
  current_rating:           number;
  initial_division:         Division;
  // Active season
  season_wins:              number;
  season_losses:            number;
  season_change:            number;
  matches_played:           number;
  total_points_won:         number;
  total_points_played:      number;
  avg_points_won_pct:       number | null;  // null when no matches played
  // All-time (summed across all seasons)
  overall_wins:             number;
  overall_losses:           number;
  // Top partnership this season
  top_partnership_name:     string | null;
  top_partnership_record:   string | null;  // "5-1" format
}

/**
 * Returns all players enriched with their active-season stats and all-time
 * record. Runs 3 queries then joins in JS — avoids N+1 per player.
 */
export async function getPlayersWithStats(seasonId: string): Promise<PlayerListItem[]> {
  const supabase = createServerClient();

  const [playersRes, seasonRes, allTimeRes, partnerRes] = await Promise.all([
    supabase.from('players').select('*').order('display_name'),
    supabase
      .from('player_summary_stats')
      .select('player_id, wins, losses, matches_played, rating_change, best_partner_id, total_points_won, total_points_played')
      .eq('season_id', seasonId),
    supabase
      .from('player_summary_stats')
      .select('player_id, wins, losses'),
    supabase
      .from('partner_summary_stats')
      .select('player_1_id, player_2_id, wins, losses')
      .eq('season_id', seasonId),
  ]);

  if (playersRes.error) throw new Error(`getPlayersWithStats players: ${playersRes.error.message}`);
  if (seasonRes.error)  throw new Error(`getPlayersWithStats season: ${seasonRes.error.message}`);
  if (allTimeRes.error) throw new Error(`getPlayersWithStats allTime: ${allTimeRes.error.message}`);

  const players     = playersRes.data  ?? [];
  const season      = seasonRes.data   ?? [];
  const allTime     = allTimeRes.data  ?? [];
  const partnerRows = partnerRes.data  ?? [];

  const seasonMap = new Map(season.map(s => [s.player_id as string, s]));
  const nameMap   = new Map(players.map(p => [p.id as string, p.display_name as string]));

  // Partner stats keyed by canonical sorted pair id
  const pairMap = new Map(
    partnerRows.map(ps => {
      const key = [ps.player_1_id as string, ps.player_2_id as string].sort().join('|');
      return [key, ps] as const;
    }),
  );

  const overall: Record<string, { wins: number; losses: number }> = {};
  for (const row of allTime) {
    const pid = row.player_id as string;
    if (!overall[pid]) overall[pid] = { wins: 0, losses: 0 };
    overall[pid].wins   += row.wins   as number;
    overall[pid].losses += row.losses as number;
  }

  return players.map(p => {
    const s  = seasonMap.get(p.id as string);
    const ov = overall[p.id as string] ?? { wins: 0, losses: 0 };

    const bestPartnerId = s?.best_partner_id as string | null;
    const topPartnershipName = bestPartnerId ? (nameMap.get(bestPartnerId) ?? null) : null;

    let topPartnershipRecord: string | null = null;
    if (bestPartnerId) {
      const pairKey  = [p.id as string, bestPartnerId].sort().join('|');
      const pairStat = pairMap.get(pairKey);
      if (pairStat) {
        topPartnershipRecord = `${pairStat.wins}-${pairStat.losses}`;
      }
    }

    const mp              = s ? (s.matches_played as number) : 0;
    const tpw             = s ? (s.total_points_won    as number) : 0;
    const tpp             = s ? (s.total_points_played as number) : 0;
    const avgPointsWonPct = tpp > 0 ? Math.round((tpw / tpp) * 1000) / 10 : null;

    return {
      id:                     p.id               as string,
      display_name:           p.display_name     as string,
      gender:                 p.gender           as 'M' | 'F',
      current_rating:         Number(p.current_rating),
      initial_division:       p.initial_division as Division,
      season_wins:            s ? (s.wins   as number) : 0,
      season_losses:          s ? (s.losses as number) : 0,
      season_change:          s ? Number(s.rating_change) : 0,
      matches_played:         mp,
      total_points_won:       tpw,
      total_points_played:    tpp,
      avg_points_won_pct:     avgPointsWonPct,
      overall_wins:           ov.wins,
      overall_losses:         ov.losses,
      top_partnership_name:   topPartnershipName,
      top_partnership_record: topPartnershipRecord,
    };
  });
}

/** Returns all Milton players, sorted by display name. */
export async function getAllPlayers(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) throw new Error(`getAllPlayers: ${error.message}`);
  return data ?? [];
}

/** Returns a single player by id, or null if not found. */
export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`getPlayerById: ${error.message}`);
  return data;
}

/** Returns all players registered in a specific division. */
export async function getPlayersByDivision(division: Division): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('initial_division', division)
    .order('current_rating', { ascending: false });

  if (error) throw new Error(`getPlayersByDivision: ${error.message}`);
  return data ?? [];
}

/** Inserts a new Milton player. Returns the created row. */
export async function createPlayer(input: PlayerInsert): Promise<Player> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`createPlayer: ${error.message}`);
  return data;
}

/**
 * Updates current_rating for a player.
 * Called by the rating engine after processing a match.
 */
export async function updatePlayerRating(
  id: string,
  newRating: number,
): Promise<Player> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .update({ current_rating: newRating })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updatePlayerRating: ${error.message}`);
  return data;
}

/** Returns all players sorted by current rating descending (for leaderboard). */
export async function getPlayerLeaderboard(): Promise<Player[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('current_rating', { ascending: false });

  if (error) throw new Error(`getPlayerLeaderboard: ${error.message}`);
  return data ?? [];
}
