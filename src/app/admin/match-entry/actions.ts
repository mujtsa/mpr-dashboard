'use server';

import { getPlayerById } from '@/lib/db/players';
import { createMatch } from '@/lib/db/matches';
import { processMatch, type ProcessMatchResult } from '@/lib/rating/processMatch';
import type { Division, MatchFormat, MatchInsert } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchEntryState =
  | { status: 'idle' }
  | { status: 'error';   message: string }
  | { status: 'success'; result: ProcessMatchResult };

// ---------------------------------------------------------------------------
// Server action
// ---------------------------------------------------------------------------

export async function submitMatch(
  _prev: MatchEntryState,
  formData: FormData,
): Promise<MatchEntryState> {

  // ---- Extract raw values ------------------------------------------------
  const seasonId      = formData.get('season_id')?.toString().trim()      ?? '';
  const weekRaw       = formData.get('week_number')?.toString().trim()     ?? '';
  const matchDate     = formData.get('match_date')?.toString().trim()      ?? '';
  const division      = formData.get('division')?.toString().trim()        ?? '';
  const matchFormat   = formData.get('match_format')?.toString().trim()    ?? '';
  const opponentClub  = formData.get('opponent_club')?.toString().trim()   ?? '';
  const player1Id     = formData.get('player_1_id')?.toString().trim()     ?? '';
  const player2Id     = formData.get('player_2_id')?.toString().trim()     ?? '';
  const miltonRaw        = formData.get('milton_score')?.toString().trim()       ?? '';
  const opponentRaw      = formData.get('opponent_score')?.toString().trim()     ?? '';
  const opponentPlayer1  = formData.get('opponent_player_1')?.toString().trim()  || null;
  const opponentPlayer2  = formData.get('opponent_player_2')?.toString().trim()  || null;

  // ---- Validation --------------------------------------------------------
  if (!seasonId)     return err('Season is required.');
  if (!matchDate)    return err('Match date is required.');
  if (!division)     return err('Division is required.');
  if (!matchFormat)  return err('Match type is required.');
  if (!opponentClub) return err('Opponent club is required.');
  if (!player1Id)    return err('Player 1 is required.');
  if (!player2Id)    return err('Player 2 is required.');
  if (player1Id === player2Id) return err('Player 1 and Player 2 cannot be the same person.');

  const weekNumber   = parseInt(weekRaw, 10);
  const miltonScore  = parseInt(miltonRaw, 10);
  const opponentScore = parseInt(opponentRaw, 10);

  if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 8)
    return err('Week number must be between 1 and 8.');
  if (isNaN(miltonScore)  || miltonScore  < 0) return err('Milton score must be 0 or greater.');
  if (isNaN(opponentScore) || opponentScore < 0) return err('Opponent score must be 0 or greater.');
  if (miltonScore === opponentScore)
    return err('One side must win — scores cannot be equal.');

  const validDivisions: Division[]   = ['4.0', '3.5+', '3.5-'];
  const validFormats:   MatchFormat[] = ['mens_doubles', 'womens_doubles', 'mixed_doubles'];
  if (!validDivisions.includes(division as Division))
    return err(`Invalid division: ${division}`);
  if (!validFormats.includes(matchFormat as MatchFormat))
    return err(`Invalid match type: ${matchFormat}`);

  // ---- Load players (capture pre-match ratings) --------------------------
  const [player1, player2] = await Promise.all([
    getPlayerById(player1Id),
    getPlayerById(player2Id),
  ]);

  if (!player1) return err('Player 1 not found.');
  if (!player2) return err('Player 2 not found.');

  // ---- Save the match ----------------------------------------------------
  const matchInsert: MatchInsert = {
    season_id:      seasonId,
    week_number:    weekNumber,
    match_date:     matchDate,
    division:       division as Division,
    match_format:   matchFormat as MatchFormat,
    opponent_club:     opponentClub,
    player_1_id:       player1Id,
    player_2_id:       player2Id,
    milton_score:      miltonScore,
    opponent_score:    opponentScore,
    opponent_player_1: opponentPlayer1,
    opponent_player_2: opponentPlayer2,
  };

  let match;
  try {
    match = await createMatch(matchInsert);
  } catch (e) {
    return err(`Failed to save match: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ---- Process ratings ---------------------------------------------------
  let result: ProcessMatchResult;
  try {
    result = await processMatch(match, player1, player2);
  } catch (e) {
    return err(`Match saved but rating processing failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { status: 'success', result };
}

function err(message: string): MatchEntryState {
  return { status: 'error', message };
}
