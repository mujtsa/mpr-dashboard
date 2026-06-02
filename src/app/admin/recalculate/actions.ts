'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getActiveSeason } from '@/lib/db/seasons';
import { getAllPlayers } from '@/lib/db/players';
import { processMatch } from '@/lib/rating/processMatch';
import type { Match, Player } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecalcResult {
  seasonName:       string;
  playersReset:     number;
  matchesProcessed: number;
  matchesFailed:    number;
  errors:           { matchId: string; error: string }[];
}

export type RecalcState =
  | { status: 'idle'    }
  | { status: 'error';   message: string    }
  | { status: 'success'; result: RecalcResult };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function recalculateRatings(
  _prev:     RecalcState,
  _formData: FormData,
): Promise<RecalcState> {

  const season = await getActiveSeason();
  if (!season) return err('No active season found.');

  const supabase = createServerClient();

  // ---- 1. Load all players -----------------------------------------------
  const allPlayers = await getAllPlayers();
  if (allPlayers.length === 0) return err('No players found.');

  // ---- 2. Reset every player to starting_rating --------------------------
  for (const player of allPlayers) {
    const { error } = await supabase
      .from('players')
      .update({ current_rating: player.starting_rating })
      .eq('id', player.id);
    if (error) return err(`Failed to reset ${player.display_name}: ${error.message}`);
  }

  // ---- 3. Clear season stats tables --------------------------------------
  const [rh, pss, parr] = await Promise.all([
    supabase.from('rating_history')       .delete().eq('season_id', season.id),
    supabase.from('player_summary_stats') .delete().eq('season_id', season.id),
    supabase.from('partner_summary_stats').delete().eq('season_id', season.id),
  ]);
  if (rh.error)   return err(`Failed to clear rating history: ${rh.error.message}`);
  if (pss.error)  return err(`Failed to clear player stats: ${pss.error.message}`);
  if (parr.error) return err(`Failed to clear partner stats: ${parr.error.message}`);

  // ---- 4. Load all matches in chronological order ------------------------
  const { data: matchRows, error: matchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('season_id', season.id)
    .order('match_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (matchErr) return err(`Failed to load matches: ${matchErr.message}`);

  const matches = (matchRows ?? []) as Match[];

  if (matches.length === 0) {
    return {
      status: 'success',
      result: {
        seasonName:       season.name,
        playersReset:     allPlayers.length,
        matchesProcessed: 0,
        matchesFailed:    0,
        errors:           [],
      },
    };
  }

  // ---- 5. Build in-memory player cache initialised to starting ratings ---
  //         This cache carries updated ratings between matches so that
  //         match N+1 uses the rating produced by match N.
  const cache = new Map<string, Player>();
  for (const p of allPlayers) {
    cache.set(p.id, { ...p, current_rating: Number(p.starting_rating) });
  }

  // ---- 6. Process matches sequentially -----------------------------------
  const errors:  RecalcResult['errors'] = [];
  let processed = 0;

  for (const match of matches) {
    const player1 = cache.get(match.player_1_id);
    const player2 = cache.get(match.player_2_id);

    if (!player1 || !player2) {
      errors.push({
        matchId: match.id,
        error:   `Player not found: ${!player1 ? match.player_1_id : match.player_2_id}`,
      });
      continue;
    }

    try {
      const result = await processMatch(match, player1, player2);

      // Update cache so the next match sees the new ratings
      cache.set(player1.id, { ...player1, current_rating: result.player1.newRating });
      cache.set(player2.id, { ...player2, current_rating: result.player2.newRating });

      processed++;
    } catch (e) {
      errors.push({
        matchId: match.id,
        error:   e instanceof Error ? e.message : String(e),
      });
    }
  }

  return {
    status: 'success',
    result: {
      seasonName:       season.name,
      playersReset:     allPlayers.length,
      matchesProcessed: processed,
      matchesFailed:    errors.length,
      errors,
    },
  };
}

function err(message: string): RecalcState {
  return { status: 'error', message };
}
