-- Add opponent player name columns to matches.
-- These are plain text (display only) — opponent players are never rated.
-- Nullable so existing rows are unaffected.

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS opponent_player_1 text,
  ADD COLUMN IF NOT EXISTS opponent_player_2 text;
