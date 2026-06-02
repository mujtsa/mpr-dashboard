-- =============================================================================
-- MPR Initial Schema — Trillium League Player Rating System
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE division_type AS ENUM ('4.0', '3.5+', '3.5-');

-- mens_doubles / womens_doubles = gender doubles; mixed_doubles = mixed
CREATE TYPE match_format AS ENUM ('mens_doubles', 'womens_doubles', 'mixed_doubles');

CREATE TYPE gender_type AS ENUM ('M', 'F');

CREATE TYPE confidence_level AS ENUM ('low', 'medium', 'high');


-- ---------------------------------------------------------------------------
-- seasons
-- One row per league season. Adding Trillium 2027, 2028 etc. is just a new row.
-- ---------------------------------------------------------------------------

CREATE TABLE seasons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,            -- "Trillium 2026"
  league      text        NOT NULL DEFAULT 'Trillium',
  year        smallint    NOT NULL,
  total_weeks smallint    NOT NULL DEFAULT 8 CHECK (total_weeks > 0),
  start_date  date,
  end_date    date,
  is_active   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX seasons_name_unique      ON seasons (name);
-- Enforce a single active season at a time
CREATE UNIQUE INDEX seasons_one_active_idx   ON seasons (is_active) WHERE is_active = true;


-- ---------------------------------------------------------------------------
-- players
-- Milton players only. Opponent players are never stored.
-- ---------------------------------------------------------------------------

CREATE TABLE players (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name     text          NOT NULL,
  gender           gender_type   NOT NULL,
  initial_division division_type NOT NULL,
  -- Starting rating is set once based on division at registration; never changes.
  starting_rating  numeric(4,2)  NOT NULL
                     CHECK (starting_rating BETWEEN 2.50 AND 5.50),
  -- Current rating is updated by the rating engine after each processed match.
  current_rating   numeric(4,2)  NOT NULL
                     CHECK (current_rating BETWEEN 2.50 AND 5.50),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_display_name_unique ON players (lower(display_name));
CREATE INDEX players_gender_idx                 ON players (gender);
CREATE INDEX players_division_idx               ON players (initial_division);


-- ---------------------------------------------------------------------------
-- matches
-- One row per doubles match played by a Milton pair.
-- Opponent players are not tracked — only opponent_club is stored.
-- ---------------------------------------------------------------------------

CREATE TABLE matches (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      uuid          NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  week_number    smallint      NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  match_date     date          NOT NULL,
  division       division_type NOT NULL,
  match_format   match_format  NOT NULL,
  opponent_club  text          NOT NULL,
  -- The two Milton players on the same side of the net
  player_1_id    uuid          NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_2_id    uuid          NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  -- Game scores (e.g. 2-1 in a best-of-3, or 1-0 for a single game)
  milton_score   smallint      NOT NULL CHECK (milton_score >= 0),
  opponent_score smallint      NOT NULL CHECK (opponent_score >= 0),
  -- Derived result stored for easy querying without a CASE expression everywhere
  result         text          GENERATED ALWAYS AS (
                   CASE
                     WHEN milton_score > opponent_score THEN 'win'
                     WHEN milton_score < opponent_score THEN 'loss'
                     ELSE 'tie'
                   END
                 ) STORED,
  created_at     timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT no_self_partner CHECK (player_1_id <> player_2_id)
);

CREATE INDEX matches_season_week_idx ON matches (season_id, week_number);
CREATE INDEX matches_player_1_idx    ON matches (player_1_id);
CREATE INDEX matches_player_2_idx    ON matches (player_2_id);
CREATE INDEX matches_date_idx        ON matches (match_date);


-- ---------------------------------------------------------------------------
-- rating_history
-- Append-only log of every rating change per player.
-- One row per player per processed match.
-- The initial row (match_id IS NULL) records the starting rating.
-- ---------------------------------------------------------------------------

CREATE TABLE rating_history (
  id             uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id      uuid             NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  season_id      uuid             NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  -- Null for the initial "season start" entry
  match_id       uuid             REFERENCES matches(id) ON DELETE SET NULL,
  week_number    smallint,
  rating_before  numeric(4,2)     NOT NULL CHECK (rating_before BETWEEN 2.50 AND 5.50),
  rating_after   numeric(4,2)     NOT NULL CHECK (rating_after  BETWEEN 2.50 AND 5.50),
  rating_change  numeric(4,2)     GENERATED ALWAYS AS (rating_after - rating_before) STORED,
  matches_played int              NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  confidence     confidence_level NOT NULL DEFAULT 'low',
  recorded_at    timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX rating_history_player_season_idx ON rating_history (player_id, season_id);
CREATE INDEX rating_history_match_idx         ON rating_history (match_id);
CREATE INDEX rating_history_recorded_at_idx   ON rating_history (recorded_at);


-- ---------------------------------------------------------------------------
-- player_summary_stats
-- One row per player per season. Updated by the rating engine after each batch.
-- Caches values the dashboard needs so queries stay fast.
-- ---------------------------------------------------------------------------

CREATE TABLE player_summary_stats (
  id              uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       uuid             NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  season_id       uuid             NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  wins            int              NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses          int              NOT NULL DEFAULT 0 CHECK (losses >= 0),
  matches_played  int              NOT NULL DEFAULT 0 CHECK (matches_played >= 0),
  starting_rating numeric(4,2)     NOT NULL CHECK (starting_rating BETWEEN 2.50 AND 5.50),
  current_rating  numeric(4,2)     NOT NULL CHECK (current_rating  BETWEEN 2.50 AND 5.50),
  rating_change   numeric(4,2)     GENERATED ALWAYS AS (current_rating - starting_rating) STORED,
  confidence      confidence_level NOT NULL DEFAULT 'low',
  -- Most successful partner this season (by win rate)
  best_partner_id uuid             REFERENCES players(id) ON DELETE SET NULL,
  -- Positive = current win streak length; negative = current loss streak length
  current_streak  int              NOT NULL DEFAULT 0,
  updated_at      timestamptz      NOT NULL DEFAULT now(),

  UNIQUE (player_id, season_id)
);

CREATE INDEX player_summary_season_idx ON player_summary_stats (season_id);


-- ---------------------------------------------------------------------------
-- partner_summary_stats
-- One row per unique pair per season.
-- player_1_id < player_2_id (UUID text comparison) enforces canonical ordering
-- so each pair is stored exactly once regardless of upload order.
-- ---------------------------------------------------------------------------

CREATE TABLE partner_summary_stats (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      uuid        NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  -- Canonical order: alphabetically smaller UUID is always player_1
  player_1_id    uuid        NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  player_2_id    uuid        NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  wins           int         NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses         int         NOT NULL DEFAULT 0 CHECK (losses >= 0),
  matches_played int         GENERATED ALWAYS AS (wins + losses) STORED,
  updated_at     timestamptz NOT NULL DEFAULT now(),

  UNIQUE (season_id, player_1_id, player_2_id),
  CONSTRAINT partner_canonical_order CHECK (player_1_id < player_2_id)
);

CREATE INDEX partner_stats_p1_idx ON partner_summary_stats (player_1_id, season_id);
CREATE INDEX partner_stats_p2_idx ON partner_summary_stats (player_2_id, season_id);


-- ---------------------------------------------------------------------------
-- updated_at trigger
-- Automatically refreshes updated_at on any UPDATE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER player_summary_set_updated_at
  BEFORE UPDATE ON player_summary_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER partner_summary_set_updated_at
  BEFORE UPDATE ON partner_summary_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
