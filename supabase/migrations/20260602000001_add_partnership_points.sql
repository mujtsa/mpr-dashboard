-- Add points tracking to partner_summary_stats.
-- points_for    = sum of milton_score across shared matches
-- points_against = sum of opponent_score across shared matches
-- Nullable defaults let existing rows stay without a backfill.

ALTER TABLE partner_summary_stats
  ADD COLUMN IF NOT EXISTS points_for     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_against int NOT NULL DEFAULT 0;
