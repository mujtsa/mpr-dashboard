import { describe, it, expect } from 'vitest';
import { calculateRating, getRatingDelta } from '../ratingEngine';
import { RATING_CONFIG } from '../ratingConfig';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function win(miltonScore: number, opponentScore: number, playerRating = 4.00) {
  return calculateRating({ playerRating, miltonScore, opponentScore });
}
function loss(miltonScore: number, opponentScore: number, playerRating = 4.00) {
  return calculateRating({ playerRating, miltonScore, opponentScore });
}

// ---------------------------------------------------------------------------
// Group 1 — Win rating table (all 11 published rows + 2 cap cases)
// ---------------------------------------------------------------------------

describe('Group 1 — win table: 15-X scores', () => {
  const winCases: [number, number, number][] = [
    [15, 14, 0.02],
    [15, 13, 0.03],
    [15, 12, 0.04],
    [15, 11, 0.05],
    [15, 10, 0.06],
    [15,  9, 0.07],
    [15,  8, 0.08],
    [15,  7, 0.09],
    [15,  6, 0.10],
    [15,  5, 0.11],
    [15,  4, 0.12],
  ];

  winCases.forEach(([m, o, expected]) => {
    it(`${m}-${o} → +${expected.toFixed(2)}`, () => {
      const out = win(m, o);
      expect(out.delta).toBe(expected);
      expect(out.newRating).toBeGreaterThan(out.oldRating);
    });
  });

  it('15-3 is capped at +0.12 (same as 15-4)', () => {
    expect(win(15, 3).delta).toBe(0.12);
  });

  it('15-0 is capped at +0.12', () => {
    expect(win(15, 0).delta).toBe(0.12);
  });
});

// ---------------------------------------------------------------------------
// Group 2 — Loss rating table (all 11 published rows + 2 cap cases)
// ---------------------------------------------------------------------------

describe('Group 2 — loss table: X-15 scores', () => {
  const lossCases: [number, number, number][] = [
    [14, 15, -0.02],
    [13, 15, -0.03],
    [12, 15, -0.04],
    [11, 15, -0.05],
    [10, 15, -0.06],
    [ 9, 15, -0.07],
    [ 8, 15, -0.08],
    [ 7, 15, -0.09],
    [ 6, 15, -0.10],
    [ 5, 15, -0.11],
    [ 4, 15, -0.12],
  ];

  lossCases.forEach(([m, o, expected]) => {
    it(`${m}-${o} → ${expected.toFixed(2)}`, () => {
      const out = loss(m, o);
      expect(out.delta).toBe(expected);
      expect(out.newRating).toBeLessThan(out.oldRating);
    });
  });

  it('3-15 is capped at -0.12 (same as 4-15)', () => {
    expect(loss(3, 15).delta).toBe(-0.12);
  });

  it('0-15 is capped at -0.12', () => {
    expect(loss(0, 15).delta).toBe(-0.12);
  });
});

// ---------------------------------------------------------------------------
// Group 3 — Both players receive the same delta
// ---------------------------------------------------------------------------

describe('Group 3 — identical delta for both players', () => {
  it('players with different ratings get the same raw delta on a win', () => {
    const p1 = calculateRating({ playerRating: 3.25, miltonScore: 15, opponentScore: 10 });
    const p2 = calculateRating({ playerRating: 4.00, miltonScore: 15, opponentScore: 10 });
    expect(getRatingDelta(15, 10)).toBe(0.06);
    // Both see +0.06 raw delta (clamping may differ at extremes, but mid-range is same)
    expect(p1.delta).toBe(0.06);
    expect(p2.delta).toBe(0.06);
  });

  it('players with different ratings get the same raw delta on a loss', () => {
    const p1 = calculateRating({ playerRating: 3.50, miltonScore: 8, opponentScore: 15 });
    const p2 = calculateRating({ playerRating: 4.25, miltonScore: 8, opponentScore: 15 });
    expect(getRatingDelta(8, 15)).toBe(-0.08);
    expect(p1.delta).toBe(-0.08);
    expect(p2.delta).toBe(-0.08);
  });

  it('delta is symmetric: same margin regardless of which side wins', () => {
    const winDelta  = getRatingDelta(15, 9);
    const lossDelta = getRatingDelta(9, 15);
    expect(winDelta).toBe(0.07);
    expect(lossDelta).toBe(-0.07);
    expect(winDelta).toBe(-lossDelta);
  });
});

// ---------------------------------------------------------------------------
// Group 4 — Rating bounds (floor 2.50, ceiling 5.50)
// ---------------------------------------------------------------------------

describe('Group 4 — rating bounds', () => {
  it('rating never falls below 2.50', () => {
    const out = calculateRating({ playerRating: 2.50, miltonScore: 4, opponentScore: 15 });
    expect(out.newRating).toBe(2.50);
    expect(out.delta).toBe(0);
  });

  it('rating never exceeds 5.50', () => {
    const out = calculateRating({ playerRating: 5.50, miltonScore: 15, opponentScore: 4 });
    expect(out.newRating).toBe(5.50);
    expect(out.delta).toBe(0);
  });

  it('partial gain when near ceiling — clamps correctly', () => {
    // 5.49 + 0.12 would be 5.61, clamped to 5.50 → actual delta = 0.01
    const out = calculateRating({ playerRating: 5.49, miltonScore: 15, opponentScore: 0 });
    expect(out.newRating).toBe(5.50);
    expect(out.delta).toBeCloseTo(0.01, 4);
  });

  it('partial loss when near floor — clamps correctly', () => {
    // 2.51 - 0.12 would be 2.39, clamped to 2.50 → actual delta = -0.01
    const out = calculateRating({ playerRating: 2.51, miltonScore: 0, opponentScore: 15 });
    expect(out.newRating).toBe(2.50);
    expect(out.delta).toBeCloseTo(-0.01, 4);
  });

  it('delta is exactly 0 when already at floor and losing', () => {
    const out = calculateRating({ playerRating: 2.50, miltonScore: 0, opponentScore: 15 });
    expect(out.delta).toBe(0);
    expect(out.newRating).toBe(2.50);
  });

  it('delta is exactly 0 when already at ceiling and winning', () => {
    const out = calculateRating({ playerRating: 5.50, miltonScore: 15, opponentScore: 0 });
    expect(out.delta).toBe(0);
    expect(out.newRating).toBe(5.50);
  });
});

// ---------------------------------------------------------------------------
// Group 5 — Non-standard scores (formula works for any point totals)
// ---------------------------------------------------------------------------

describe('Group 5 — non-standard scores', () => {
  it('11-7 win (diff=4) → +0.05', () => {
    expect(getRatingDelta(11, 7)).toBe(0.05);
  });

  it('7-11 loss (diff=4) → -0.05', () => {
    expect(getRatingDelta(7, 11)).toBe(-0.05);
  });

  it('21-19 win (diff=2) → +0.03', () => {
    expect(getRatingDelta(21, 19)).toBe(0.03);
  });

  it('19-21 loss (diff=2) → -0.03', () => {
    expect(getRatingDelta(19, 21)).toBe(-0.03);
  });

  it('21-0 win (diff=21, capped) → +0.12', () => {
    expect(getRatingDelta(21, 0)).toBe(0.12);
  });

  it('0-21 loss (diff=21, capped) → -0.12', () => {
    expect(getRatingDelta(0, 21)).toBe(-0.12);
  });
});

// ---------------------------------------------------------------------------
// Group 6 — Config constants and output shape
// ---------------------------------------------------------------------------

describe('Group 6 — config and output invariants', () => {
  it('returns oldRating unchanged', () => {
    const out = calculateRating({ playerRating: 3.75, miltonScore: 15, opponentScore: 12 });
    expect(out.oldRating).toBe(3.75);
  });

  it('delta = newRating − oldRating', () => {
    const out = calculateRating({ playerRating: 3.50, miltonScore: 15, opponentScore: 8 });
    expect(out.delta).toBeCloseTo(out.newRating - out.oldRating, 4);
  });

  it('getRatingDelta matches calculateRating delta (mid-range player)', () => {
    const delta = getRatingDelta(15, 11);
    const out   = calculateRating({ playerRating: 4.00, miltonScore: 15, opponentScore: 11 });
    expect(delta).toBe(out.delta);
  });

  it('SCORE_DELTA_MIN is 0.02 — smallest possible win/loss', () => {
    expect(RATING_CONFIG.SCORE_DELTA_MIN).toBe(0.02);
    expect(getRatingDelta(15, 14)).toBe(RATING_CONFIG.SCORE_DELTA_MIN);
  });

  it('SCORE_DELTA_MAX is 0.12 — largest possible win/loss', () => {
    expect(RATING_CONFIG.SCORE_DELTA_MAX).toBe(0.12);
    expect(getRatingDelta(15, 4)).toBe(RATING_CONFIG.SCORE_DELTA_MAX);
    expect(getRatingDelta(15, 3)).toBe(RATING_CONFIG.SCORE_DELTA_MAX);
    expect(getRatingDelta(15, 0)).toBe(RATING_CONFIG.SCORE_DELTA_MAX);
  });

  it('all output values are rounded to 4 decimal places', () => {
    const out = calculateRating({ playerRating: 3.333, miltonScore: 15, opponentScore: 8 });
    const decimals = (n: number) => (n.toString().split('.')[1] ?? '').length;
    expect(decimals(out.oldRating)).toBeLessThanOrEqual(4);
    expect(decimals(out.newRating)).toBeLessThanOrEqual(4);
    expect(decimals(out.delta)).toBeLessThanOrEqual(4);
  });
});
