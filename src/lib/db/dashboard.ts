import { createServerClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeasonSummary {
  totalPlayers:  number;
  totalMatches:  number;
  totalWins:     number;
  totalLosses:   number;
  currentWeek:   number | null;
}

export interface PlayerStatWithName {
  player_id:       string;
  display_name:    string;
  wins:            number;
  losses:          number;
  matches_played:  number;
  starting_rating: number;
  current_rating:  number;
  rating_change:   number;
  confidence:      string;
  current_streak:  number;
}

export interface PartnerStatWithNames {
  id:             string;
  wins:           number;
  losses:         number;
  matches_played: number;
  points_for:     number;
  points_against: number;
  player_1: { id: string; display_name: string };
  player_2: { id: string; display_name: string };
}

export interface WeeklyGain {
  player_id:          string;
  display_name:       string;
  total_gain:         number;
  matches_this_week:  number;
}

export interface WeeklyGainEntry {
  player_id:      string;
  display_name:   string;
  weekly_gain:    number;
  current_rating: number;
  match_count:    number;
}

export interface WeeklyGainsSummary {
  availableWeeks: number[];
  // Keys are week numbers stored as strings (JSON serialisation)
  byWeek: Record<string, WeeklyGainEntry[]>;
}

export interface AvgPointsWonEntry {
  player_id:       string;
  display_name:    string;
  avg_pct:         number;
  matches_played:  number;
}

// ---------------------------------------------------------------------------
// Season Summary
// ---------------------------------------------------------------------------

export async function getSeasonSummary(seasonId: string): Promise<SeasonSummary> {
  const supabase = createServerClient();

  const [playersRes, matchesRes] = await Promise.all([
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase
      .from('matches')
      .select('result, week_number')
      .eq('season_id', seasonId),
  ]);

  if (playersRes.error)  throw new Error(`getSeasonSummary players: ${playersRes.error.message}`);
  if (matchesRes.error)  throw new Error(`getSeasonSummary matches: ${matchesRes.error.message}`);

  const matches    = matchesRes.data ?? [];
  const weekNums   = matches.map(m => m.week_number).filter((w): w is number => w != null);

  return {
    totalPlayers: playersRes.count ?? 0,
    totalMatches: matches.length,
    totalWins:    matches.filter(m => m.result === 'win').length,
    totalLosses:  matches.filter(m => m.result === 'loss').length,
    currentWeek:  weekNums.length > 0 ? Math.max(...weekNums) : null,
  };
}

// ---------------------------------------------------------------------------
// Most Improved Players
// ---------------------------------------------------------------------------

export async function getMostImproved(
  seasonId: string,
  limit = 5,
): Promise<PlayerStatWithName[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*, player:players!player_id(id, display_name)')
    .eq('season_id', seasonId)
    .gt('matches_played', 0)
    .order('rating_change', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getMostImproved: ${error.message}`);

  return (data ?? []).map(row => ({
    player_id:       row.player_id,
    display_name:    (row.player as { display_name: string })?.display_name ?? '',
    wins:            row.wins,
    losses:          row.losses,
    matches_played:  row.matches_played,
    starting_rating: Number(row.starting_rating),
    current_rating:  Number(row.current_rating),
    rating_change:   Number(row.rating_change),
    confidence:      row.confidence,
    current_streak:  row.current_streak,
  }));
}

// ---------------------------------------------------------------------------
// Best Win Percentage
// ---------------------------------------------------------------------------

/**
 * Returns players with the highest win percentage this season.
 * Eligibility: minimum 4 matches.
 * Tiebreakers: wins → rating_change → current_rating.
 */
export async function getBestWinPct(
  seasonId:   string,
  limit       = 5,
  minMatches  = 4,
): Promise<PlayerStatWithName[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('*, player:players!player_id(id, display_name)')
    .eq('season_id', seasonId)
    .gte('matches_played', minMatches);

  if (error) throw new Error(`getBestWinPct: ${error.message}`);

  const rows = (data ?? []).map(row => ({
    player_id:       row.player_id     as string,
    display_name:    (row.player as { display_name: string })?.display_name ?? '',
    wins:            row.wins          as number,
    losses:          row.losses        as number,
    matches_played:  row.matches_played as number,
    starting_rating: Number(row.starting_rating),
    current_rating:  Number(row.current_rating),
    rating_change:   Number(row.rating_change),
    confidence:      row.confidence    as string,
    current_streak:  row.current_streak as number,
  }));

  rows.sort((a, b) => {
    const aWp = a.wins / a.matches_played;
    const bWp = b.wins / b.matches_played;
    if (Math.abs(bWp - aWp) > 0.0001)  return bWp - aWp;
    if (a.wins !== b.wins)              return b.wins - a.wins;
    if (a.rating_change !== b.rating_change) return b.rating_change - a.rating_change;
    return b.current_rating - a.current_rating;
  });

  return rows.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Best Partner Combinations
// ---------------------------------------------------------------------------

/**
 * Returns top partnerships for a season.
 * Eligibility: minimum 2 matches played together.
 * Ranking: win% → point differential → avg points conceded → matches played.
 */
export async function getTopPartnerships(
  seasonId: string,
  limit = 5,
): Promise<PartnerStatWithNames[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('partner_summary_stats')
    .select(`
      id, wins, losses, matches_played, points_for, points_against,
      player_1:players!player_1_id(id, display_name),
      player_2:players!player_2_id(id, display_name)
    `)
    .eq('season_id', seasonId)
    .gte('matches_played', 2);

  if (error) throw new Error(`getTopPartnerships: ${error.message}`);

  const rows = (data ?? []) as unknown as PartnerStatWithNames[];

  rows.sort((a, b) => {
    // 1. Win % — highest first
    const aWinPct = a.wins / a.matches_played;
    const bWinPct = b.wins / b.matches_played;
    if (Math.abs(bWinPct - aWinPct) > 0.0001) return bWinPct - aWinPct;

    // 2. Point differential — highest first
    const aDiff = a.points_for - a.points_against;
    const bDiff = b.points_for - b.points_against;
    if (aDiff !== bDiff) return bDiff - aDiff;

    // 3. Average points conceded — lowest first
    const aAvg = a.points_against / a.matches_played;
    const bAvg = b.points_against / b.matches_played;
    if (Math.abs(aAvg - bAvg) > 0.001) return aAvg - bAvg;

    // 4. Matches played — most first
    return b.matches_played - a.matches_played;
  });

  return rows.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Biggest Rating Gains This Week
// ---------------------------------------------------------------------------

export async function getWeeklyGains(
  seasonId:   string,
  weekNumber: number,
  limit = 5,
): Promise<WeeklyGain[]> {
  const supabase = createServerClient();

  const { data: history, error: hErr } = await supabase
    .from('rating_history')
    .select('player_id, rating_change')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber);

  if (hErr) throw new Error(`getWeeklyGains history: ${hErr.message}`);
  if (!history || history.length === 0) return [];

  // Aggregate rating_change per player
  const tally: Record<string, { total: number; count: number }> = {};
  for (const row of history) {
    const pid = row.player_id as string;
    if (!tally[pid]) tally[pid] = { total: 0, count: 0 };
    tally[pid].total += Number(row.rating_change);
    tally[pid].count += 1;
  }

  // Only players with a net positive gain this week
  const positive = Object.entries(tally)
    .filter(([, v]) => v.total > 0)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, limit);

  if (positive.length === 0) return [];

  // Fetch names
  const ids = positive.map(([pid]) => pid);
  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, display_name')
    .in('id', ids);

  if (pErr) throw new Error(`getWeeklyGains players: ${pErr.message}`);
  const nameMap = new Map((players ?? []).map(p => [p.id as string, p.display_name as string]));

  return positive.map(([player_id, { total, count }]) => ({
    player_id,
    display_name:      nameMap.get(player_id) ?? 'Unknown',
    total_gain:        Math.round(total * 10000) / 10000,
    matches_this_week: count,
  }));
}

// ---------------------------------------------------------------------------
// Weekly Gains Summary (all weeks, for client-side week selector)
// ---------------------------------------------------------------------------

export async function getWeeklyGainsSummary(seasonId: string): Promise<WeeklyGainsSummary> {
  const supabase = createServerClient();

  const { data: history, error: hErr } = await supabase
    .from('rating_history')
    .select('player_id, week_number, rating_change')
    .eq('season_id', seasonId)
    .not('week_number', 'is', null);

  if (hErr) throw new Error(`getWeeklyGainsSummary: ${hErr.message}`);
  if (!history || history.length === 0) return { availableWeeks: [], byWeek: {} };

  // Collect unique player IDs
  const playerIds = [...new Set(history.map(h => h.player_id as string))];

  const { data: players, error: pErr } = await supabase
    .from('players')
    .select('id, display_name, current_rating')
    .in('id', playerIds);

  if (pErr) throw new Error(`getWeeklyGainsSummary players: ${pErr.message}`);

  const playerMap = new Map(
    (players ?? []).map(p => [
      p.id as string,
      { display_name: p.display_name as string, current_rating: Number(p.current_rating) },
    ]),
  );

  // Aggregate rating_change per (week, player)
  const aggr: Record<string, Record<string, { total: number; count: number }>> = {};
  const weekSet = new Set<number>();

  for (const row of history) {
    const w   = String(row.week_number as number);
    const pid = row.player_id as string;
    weekSet.add(row.week_number as number);
    if (!aggr[w])       aggr[w]       = {};
    if (!aggr[w][pid])  aggr[w][pid]  = { total: 0, count: 0 };
    aggr[w][pid].total += Number(row.rating_change);
    aggr[w][pid].count += 1;
  }

  const availableWeeks = [...weekSet].sort((a, b) => a - b);

  const byWeek: Record<string, WeeklyGainEntry[]> = {};
  for (const week of availableWeeks) {
    const wKey = String(week);
    byWeek[wKey] = Object.entries(aggr[wKey] ?? {})
      .map(([player_id, { total, count }]) => {
        const p = playerMap.get(player_id);
        return {
          player_id,
          display_name:   p?.display_name   ?? 'Unknown',
          weekly_gain:    Math.round(total * 10000) / 10000,
          current_rating: p?.current_rating ?? 0,
          match_count:    count,
        };
      })
      .sort((a, b) => b.weekly_gain - a.weekly_gain);
  }

  return { availableWeeks, byWeek };
}

// ---------------------------------------------------------------------------
// Best Avg Points Won %
// ---------------------------------------------------------------------------

/**
 * Returns players with the highest Avg Points Won % this season.
 * Requires at least minMatches matches to be eligible.
 * avg_pct = total_points_won / total_points_played × 100, rounded to 1 dp.
 */
export async function getBestAvgPointsWon(
  seasonId:   string,
  limit       = 5,
  minMatches  = 4,
): Promise<AvgPointsWonEntry[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('player_summary_stats')
    .select('player_id, matches_played, total_points_won, total_points_played, player:players!player_id(display_name)')
    .eq('season_id', seasonId)
    .gte('matches_played', minMatches)
    .gt('total_points_played', 0);

  if (error) throw new Error(`getBestAvgPointsWon: ${error.message}`);

  return (data ?? [])
    .map(row => ({
      player_id:      row.player_id      as string,
      display_name:   ((row.player as unknown) as { display_name: string })?.display_name ?? '',
      avg_pct:        Math.round((row.total_points_won as number) / (row.total_points_played as number) * 1000) / 10,
      matches_played: row.matches_played as number,
    }))
    .sort((a, b) => b.avg_pct - a.avg_pct)
    .slice(0, limit);
}
