-- Add per-player point totals to player_summary_stats.
-- Used to compute Avg Points Won % on the player profile and players list.
-- Defaults to 0 so existing rows are valid until the next recalculate.

ALTER TABLE player_summary_stats
  ADD COLUMN IF NOT EXISTS total_points_won    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_points_played int NOT NULL DEFAULT 0;
