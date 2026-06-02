// =============================================================================
// MPR Database Types
// Hand-maintained to match supabase/migrations/20260601000000_initial_schema.sql
// Update whenever the schema changes.
// =============================================================================

// ---------------------------------------------------------------------------
// Enum types (mirror Postgres enums)
// ---------------------------------------------------------------------------

export type Division = '4.0' | '3.5+' | '3.5-';

export type MatchFormat = 'mens_doubles' | 'womens_doubles' | 'mixed_doubles';

export type Gender = 'M' | 'F';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type MatchResult = 'win' | 'loss' | 'tie';

// ---------------------------------------------------------------------------
// Row types (what SELECT queries return)
// ---------------------------------------------------------------------------

export interface Season {
  id:          string;
  name:        string;
  league:      string;
  year:        number;
  total_weeks: number;
  start_date:  string | null;   // ISO date string "YYYY-MM-DD"
  end_date:    string | null;
  is_active:   boolean;
  created_at:  string;          // ISO timestamptz
}

export interface Player {
  id:               string;
  display_name:     string;
  gender:           Gender;
  initial_division: Division;
  starting_rating:  number;
  current_rating:   number;
  created_at:       string;
  updated_at:       string;
}

export interface Match {
  id:                 string;
  season_id:          string;
  week_number:        number;
  match_date:         string;         // ISO date string
  division:           Division;
  match_format:       MatchFormat;
  opponent_club:      string;
  player_1_id:        string;
  player_2_id:        string;
  milton_score:       number;
  opponent_score:     number;
  result:             MatchResult;    // generated column
  // Opponent player names — stored for display only, never rated
  opponent_player_1:  string | null;
  opponent_player_2:  string | null;
  created_at:         string;
}

export interface RatingHistory {
  id:             string;
  player_id:      string;
  season_id:      string;
  match_id:       string | null;  // null = season-start entry
  week_number:    number | null;
  rating_before:  number;
  rating_after:   number;
  rating_change:  number;         // generated column
  matches_played: number;
  confidence:     ConfidenceLevel;
  recorded_at:    string;
}

export interface PlayerSummaryStats {
  id:              string;
  player_id:       string;
  season_id:       string;
  wins:            number;
  losses:          number;
  matches_played:  number;
  starting_rating: number;
  current_rating:  number;
  rating_change:   number;        // generated column
  confidence:          ConfidenceLevel;
  best_partner_id:     string | null;
  current_streak:      number;        // positive = win streak, negative = loss streak
  total_points_won:    number;        // sum of milton_score across all player matches
  total_points_played: number;        // sum of (milton_score + opponent_score) across all matches
  updated_at:          string;
}

export interface PartnerSummaryStats {
  id:             string;
  season_id:      string;
  player_1_id:    string;         // always the lexicographically smaller UUID
  player_2_id:    string;
  wins:           number;
  losses:         number;
  matches_played: number;         // generated column (wins + losses)
  points_for:     number;         // sum of milton_score across shared matches
  points_against: number;         // sum of opponent_score across shared matches
  updated_at:     string;
}

// ---------------------------------------------------------------------------
// Insert types (omit generated columns and fields that default in the DB)
// ---------------------------------------------------------------------------

export type SeasonInsert = Omit<Season, 'id' | 'created_at'> & {
  id?:         string;
  created_at?: string;
};

export type PlayerInsert = Omit<Player, 'id' | 'created_at' | 'updated_at'> & {
  id?:         string;
  created_at?: string;
  updated_at?: string;
};

export type MatchInsert = Omit<Match, 'id' | 'result' | 'created_at'> & {
  id?:         string;
  created_at?: string;
};

export type RatingHistoryInsert = Omit<
  RatingHistory,
  'id' | 'rating_change' | 'recorded_at'
> & {
  id?:          string;
  recorded_at?: string;
};

export type PlayerSummaryStatsInsert = Omit<
  PlayerSummaryStats,
  'id' | 'rating_change' | 'updated_at'
> & {
  id?:         string;
  updated_at?: string;
};

export type PartnerSummaryStatsInsert = Omit<
  PartnerSummaryStats,
  'id' | 'matches_played' | 'updated_at'
> & {
  id?:         string;
  updated_at?: string;
};

// ---------------------------------------------------------------------------
// Helper: division → default starting rating
// ---------------------------------------------------------------------------

export const DIVISION_STARTING_RATING: Record<Division, number> = {
  '4.0':  4.00,
  '3.5+': 3.50,
  '3.5-': 3.25,
};

export const DIVISION_BASELINE: Record<Division, number> = {
  '4.0':  4.00,
  '3.5+': 3.50,
  '3.5-': 3.25,
};

export const RATING_BOUNDS = { MIN: 2.50, MAX: 5.50 } as const;

export const CONFIDENCE_THRESHOLDS = { MEDIUM: 8, HIGH: 16 } as const;
