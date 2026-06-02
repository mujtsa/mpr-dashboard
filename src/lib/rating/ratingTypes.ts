// ---------------------------------------------------------------------------
// Simplified MPR Rating Types
// Rating depends only on match result and score. No partner or division logic.
// ---------------------------------------------------------------------------

export interface RatingInput {
  /** Player's current rating before this match */
  playerRating:  number;
  /** Points scored by the Milton pair */
  miltonScore:   number;
  /** Points scored by the opponent pair */
  opponentScore: number;
}

export interface RatingOutput {
  oldRating: number;
  newRating: number;
  /** Signed delta after clamping — positive = gain, negative = loss */
  delta:     number;
}
