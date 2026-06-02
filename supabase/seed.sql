-- =============================================================================
-- MPR Seed Data
-- Inserts Trillium 2026 as the active season.
-- Run AFTER the initial schema migration.
-- =============================================================================

INSERT INTO seasons (name, league, year, total_weeks, start_date, is_active)
VALUES (
  'Trillium 2026',
  'Trillium',
  2026,
  8,
  '2026-04-07',   -- adjust to actual season start date
  true
);
