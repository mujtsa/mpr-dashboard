// =============================================================================
// MPR Rating Configuration
// All tuning values live here. Nothing is hardcoded in the engine.
// =============================================================================

export const RATING_CONFIG = {

  // ---------------------------------------------------------------------------
  // Score-based delta
  //
  // magnitude = BASE + score_diff × PER_POINT, clamped to [MIN, MAX]
  //
  // score_diff = |milton_score − opponent_score|
  //
  // Produces the published rating table:
  //   diff  1 → 0.02   diff  7 → 0.08
  //   diff  2 → 0.03   diff  8 → 0.09
  //   diff  3 → 0.04   diff  9 → 0.10
  //   diff  4 → 0.05   diff 10 → 0.11
  //   diff  5 → 0.06   diff ≥11 → 0.12 (capped)
  //   diff  6 → 0.07
  //
  // Win:  delta = +magnitude
  // Loss: delta = −magnitude
  // ---------------------------------------------------------------------------
  SCORE_DELTA_BASE:   0.01,   // added regardless of margin
  SCORE_DELTA_PER_PT: 0.01,   // per point of score margin
  SCORE_DELTA_MIN:    0.02,   // floor  (1-point margin)
  SCORE_DELTA_MAX:    0.12,   // ceiling (11+ point margin)

  // ---------------------------------------------------------------------------
  // Rating bounds
  // ---------------------------------------------------------------------------
  RATING_MIN: 2.50,
  RATING_MAX: 5.50,

  // ---------------------------------------------------------------------------
  // Division starting ratings / chart baselines
  // (Used for player creation and the rating-trend reference line — not by the engine)
  // ---------------------------------------------------------------------------
  DIVISION_BASELINES: {
    '4.0':  4.00,
    '3.5+': 3.50,
    '3.5-': 3.25,
  } as const,

} as const;

export type RatingConfig = typeof RATING_CONFIG;
