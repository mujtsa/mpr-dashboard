'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getActiveSeason } from '@/lib/db/seasons';
import { getAllPlayers, createPlayer } from '@/lib/db/players';
import { createMatch } from '@/lib/db/matches';
import { processMatch } from '@/lib/rating/processMatch';
import { RATING_CONFIG } from '@/lib/rating/ratingConfig';
import type { Player, Division, MatchFormat } from '@/types/database';

// ---------------------------------------------------------------------------
// Shared types (exported so client component can import them)
// ---------------------------------------------------------------------------

export interface ParsedCsvRow {
  rowIndex:      number;
  date:          string;
  week_number:   number;
  division:      string;
  match_format:  string;
  opponent_club: string;
  player_1:      string;
  player_2:      string;
  milton_score:      number;
  opponent_score:    number;
  opponent_player_1: string | null;
  opponent_player_2: string | null;
}

export interface MatchImportSummary {
  rowIndex:      number;
  player1:       string;
  player2:       string;
  player1Before: number;
  player1After:  number;
  player1Delta:  number;
  player2Before: number;
  player2After:  number;
  player2Delta:  number;
}

export interface RowError {
  rowIndex: number;
  player1:  string;
  player2:  string;
  error:    string;
}

export interface ImportResult {
  totalRows:      number;
  importedCount:  number;
  skippedCount:   number;
  playersCreated: string[];
  rowErrors:      RowError[];
  matchSummaries: MatchImportSummary[];
}

export type ImportState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; result: ImportResult };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function importCsv(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {

  const rowsJson = formData.get('rows')?.toString() ?? '';
  if (!rowsJson) return { status: 'error', message: 'No rows received.' };

  let rows: ParsedCsvRow[];
  try {
    rows = JSON.parse(rowsJson);
  } catch {
    return { status: 'error', message: 'Invalid row data — please re-upload.' };
  }

  if (rows.length === 0) return { status: 'error', message: 'CSV contains no valid rows.' };

  // ---- Active season -----------------------------------------------------
  const season = await getActiveSeason();
  if (!season) return { status: 'error', message: 'No active season found. Create one in Supabase first.' };

  // ---- Pre-scan: infer gender + first division per player ----------------
  const genderMap  = new Map<string, 'M' | 'F'>();
  const divisionMap = new Map<string, Division>();

  for (const row of rows) {
    const p1 = row.player_1.toLowerCase();
    const p2 = row.player_2.toLowerCase();
    // Gender from match format
    if (row.match_format === 'mens_doubles') {
      genderMap.set(p1, 'M'); genderMap.set(p2, 'M');
    } else if (row.match_format === 'womens_doubles') {
      genderMap.set(p1, 'F'); genderMap.set(p2, 'F');
    }
    // First division (for new player registration)
    if (!divisionMap.has(p1)) divisionMap.set(p1, row.division as Division);
    if (!divisionMap.has(p2)) divisionMap.set(p2, row.division as Division);
  }

  // ---- Load existing players into cache (case-insensitive key) -----------
  const allPlayers = await getAllPlayers();
  const playerCache = new Map<string, Player>();
  for (const p of allPlayers) {
    playerCache.set(p.display_name.toLowerCase(), p);
  }

  const playersCreated: string[] = [];

  // ---- Process rows sequentially -----------------------------------------
  const matchSummaries: MatchImportSummary[] = [];
  const rowErrors:       RowError[]          = [];

  for (const row of rows) {
    try {
      const player1 = await findOrCreate(
        row.player_1, genderMap, divisionMap, playerCache, playersCreated,
      );
      const player2 = await findOrCreate(
        row.player_2, genderMap, divisionMap, playerCache, playersCreated,
      );

      const match = await createMatch({
        season_id:      season.id,
        week_number:    row.week_number,
        match_date:     row.date,
        division:       row.division      as Division,
        match_format:   row.match_format  as MatchFormat,
        opponent_club:     row.opponent_club,
        player_1_id:       player1.id,
        player_2_id:       player2.id,
        milton_score:      row.milton_score,
        opponent_score:    row.opponent_score,
        opponent_player_1: row.opponent_player_1,
        opponent_player_2: row.opponent_player_2,
      });

      const result = await processMatch(match, player1, player2);

      // Update cache so subsequent rows see updated ratings
      playerCache.set(row.player_1.toLowerCase(), {
        ...player1, current_rating: result.player1.newRating,
      });
      playerCache.set(row.player_2.toLowerCase(), {
        ...player2, current_rating: result.player2.newRating,
      });

      matchSummaries.push({
        rowIndex:      row.rowIndex,
        player1:       result.player1.displayName,
        player2:       result.player2.displayName,
        player1Before: result.player1.oldRating,
        player1After:  result.player1.newRating,
        player1Delta:  result.player1.delta,
        player2Before: result.player2.oldRating,
        player2After:  result.player2.newRating,
        player2Delta:  result.player2.delta,
      });

    } catch (e) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        player1:  row.player_1,
        player2:  row.player_2,
        error:    e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    status: 'success',
    result: {
      totalRows:      rows.length,
      importedCount:  matchSummaries.length,
      skippedCount:   rowErrors.length,
      playersCreated,
      rowErrors,
      matchSummaries,
    },
  };
}

// ---------------------------------------------------------------------------
// Helper: find existing player or create new one
// ---------------------------------------------------------------------------

async function findOrCreate(
  displayName: string,
  genderMap:   Map<string, 'M' | 'F'>,
  divisionMap: Map<string, Division>,
  cache:       Map<string, Player>,
  created:     string[],
): Promise<Player> {
  const key = displayName.toLowerCase();

  if (cache.has(key)) return cache.get(key)!;

  // Try case-insensitive DB lookup (handles players added outside CSV)
  const supabase = createServerClient();
  const { data } = await supabase
    .from('players')
    .select('*')
    .ilike('display_name', displayName)
    .maybeSingle();

  if (data) {
    cache.set(key, data as Player);
    return data as Player;
  }

  // Create new player
  const division      = divisionMap.get(key) ?? '3.5-';
  const gender        = genderMap.get(key) ?? 'M';
  const startingRating = RATING_CONFIG.DIVISION_BASELINES[division] ?? 3.25;

  const newPlayer = await createPlayer({
    display_name:     displayName,
    gender,
    initial_division: division,
    starting_rating:  startingRating,
    current_rating:   startingRating,
  });

  cache.set(key, newPlayer);
  created.push(displayName);
  return newPlayer;
}
