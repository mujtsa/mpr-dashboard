import { RATING_CONFIG } from './ratingConfig';
import type { RatingInput, RatingOutput } from './ratingTypes';

// =============================================================================
// MPR Rating Engine — simplified score-based model
//
// Formula:
//   score_diff = |milton_score − opponent_score|
//   magnitude  = clamp(BASE + score_diff × PER_POINT, MIN, MAX)
//   delta      = +magnitude (win) or −magnitude (loss)
//   new_rating = clamp(old_rating + delta, RATING_MIN, RATING_MAX)
//
// Both Milton players receive exactly the same rating change.
// No partner weighting. No division multipliers. No confidence tracking.
// =============================================================================

export function calculateRating(input: RatingInput): RatingOutput {
  const { playerRating, miltonScore, opponentScore } = input;

  const scoreDiff = Math.abs(miltonScore - opponentScore);
  const isWin     = miltonScore > opponentScore;

  const magnitude = clamp(
    RATING_CONFIG.SCORE_DELTA_BASE + scoreDiff * RATING_CONFIG.SCORE_DELTA_PER_PT,
    RATING_CONFIG.SCORE_DELTA_MIN,
    RATING_CONFIG.SCORE_DELTA_MAX,
  );

  const rawDelta  = isWin ? magnitude : -magnitude;
  const newRating = clamp(playerRating + rawDelta, RATING_CONFIG.RATING_MIN, RATING_CONFIG.RATING_MAX);

  return {
    oldRating: round4(playerRating),
    newRating: round4(newRating),
    delta:     round4(newRating - playerRating),
  };
}

/**
 * Returns just the signed rating delta for a given score, without applying
 * it to a specific player rating. Useful for display previews.
 */
export function getRatingDelta(miltonScore: number, opponentScore: number): number {
  const scoreDiff = Math.abs(miltonScore - opponentScore);
  const isWin     = miltonScore > opponentScore;
  const magnitude = clamp(
    RATING_CONFIG.SCORE_DELTA_BASE + scoreDiff * RATING_CONFIG.SCORE_DELTA_PER_PT,
    RATING_CONFIG.SCORE_DELTA_MIN,
    RATING_CONFIG.SCORE_DELTA_MAX,
  );
  return round4(isWin ? magnitude : -magnitude);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
