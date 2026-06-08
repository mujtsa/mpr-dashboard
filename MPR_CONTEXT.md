# MPR_CONTEXT.md — Source of Truth for Milton Player Rating (MPR)

## Project Name
Milton Player Rating (MPR)

## Purpose
An internal player analytics dashboard for Milton Pickleball players participating in Trillium League.

---

## Scope
- Milton players only.
- Opponent player names are stored for display purposes only — they are never rated.
- Opponent clubs are tracked.
- Ratings are DUPR-inspired but not DUPR.
- Focus on player development and performance analytics.

---

## Future Seasons
- Support Trillium 2026 now.
- Design so Trillium 2027, 2028 and future seasons can be added without redesign.

---

## Season Structure
- 8 weeks per season.
- Players may play 0–4 matches per week.
- Typical week: 2 gender doubles + 2 mixed doubles.
- Missing weeks must not affect rating.

---

## Starting Ratings
| Division | Starting Rating |
|----------|----------------|
| 4.0      | 4.00           |
| 3.5+     | 3.50           |
| 3.5-     | 3.25           |

---

## Rating Rules
- Rating change depends only on match result and score margin.
- Partner ratings do not affect rating change.
- Division does not affect rating change.
- Both Milton players on the same team receive exactly the same rating change.
- Rating confidence is not tracked.

## Rating Formula

```
score_diff = |milton_score − opponent_score|
magnitude  = clamp(0.01 + score_diff × 0.01, 0.02, 0.12)
delta      = +magnitude (win) or −magnitude (loss)
new_rating = clamp(current_rating + delta, 2.50, 5.50)
```

## Rating Table

| Score  | Delta  |
|--------|--------|
| 15-14  | +0.02  |
| 15-13  | +0.03  |
| 15-12  | +0.04  |
| 15-11  | +0.05  |
| 15-10  | +0.06  |
| 15-9   | +0.07  |
| 15-8   | +0.08  |
| 15-7   | +0.09  |
| 15-6   | +0.10  |
| 15-5   | +0.11  |
| 15-4 or better | +0.12 |
| 14-15  | -0.02  |
| 13-15  | -0.03  |
| 12-15  | -0.04  |
| 11-15  | -0.05  |
| 10-15  | -0.06  |
| 9-15   | -0.07  |
| 8-15   | -0.08  |
| 7-15   | -0.09  |
| 6-15   | -0.10  |
| 5-15   | -0.11  |
| 4-15 or worse  | -0.12 |

## Rating Bounds
- Minimum: **2.50**
- Maximum: **5.50**

## Division Baselines
Used for player creation (starting rating) and chart reference lines only — not part of the rating formula.

| Division | Baseline / Starting Rating |
|----------|---------------------------|
| 4.0      | 4.00                      |
| 3.5+     | 3.50                      |
| 3.5-     | 3.25                      |

---

## Navigation (Public)
- Dashboard
- Players
- FAQ

Admin pages exist at `/admin/upload`, `/admin/match-entry`, `/admin/recalculate` but are not linked from the public navigation.
The `/matches` route redirects to `/dashboard`. Match history is accessed via the dashboard filterable results and player profiles.

---

## Dashboard Views
- Season Summary
- Team Performance (week-by-week record vs each opponent club, by division)
- Most Improved Players (season rating change, no duplicates with win %)
- Best Win Percentage (min. 4 matches; sort: win% → wins → rating change → current rating)
- Top Partnerships (min. 2 matches)
- Biggest Gains by Week (week selector, defaults to latest week with matches)
- Best Avg Points Won % (min. 4 matches)
- Match Results (filterable: week, division, type, player, opponent, result)

## Team Performance Section

Placement: directly below Season Summary, above player analytics widgets.

Columns: Week | Opponent Club | 4.0 | 3.5+ | 3.5− | Total

Calculation:
- For each (week_number, opponent_club) combination, count wins and losses per division.
- Record = match wins-losses (e.g. 4-8).
- If a division was not played that week vs that club, the cell is blank (not 0-0).
- Total = sum of wins and losses across all divisions.

Sort: week descending, then opponent club alphabetically.

Colour coding: green if wins > losses, red if losses > wins, neutral if tied.

## Dashboard Design Rules
- Dashboard summary widgets show top 5 entries only.
- Dashboard sections must not duplicate the same metric.
- Most Improved = season rating change only.
- Best Win Percentage = win% with minimum 4 matches; columns: Player | Record | Win % only (no Change column).
- Biggest Gains by Week supports a week dropdown (1–8), default to latest week with data; top 5 shown.
- Match Results shows all season matches with filters; paginated at 10 per page; filters reset pagination to page 1.
- No dedicated Matches page; history accessible via dashboard filters and player profiles.

---

## Player Profile
- Current Rating (no confidence badge)
- Starting Rating
- Season Change
- Season Record
- Overall Record
- Win %
- Avg Points Won %
- Rating Trend
- Match History
- Top Partnership (name + record only, no breakdown table)
- Recent Form
- Streaks

---

## Avg Points Won %

**Definition:** What percentage of all points played in a player's matches were scored by the Milton side.

**Formula:**
```
Avg Points Won % = total_points_won / total_points_played × 100
```

**Where:**
- `total_points_won` = sum of `milton_score` across all player's season matches
- `total_points_played` = sum of (`milton_score + opponent_score`) across all season matches

**Display:**
- Player profile: shown in primary stats row
- Players list card: shown in stats row (replaces the Overall column)
- Dashboard: "Best Avg Points Won %" card (min. 4 matches)
- Show `N/A` when no matches played

**Stored in:** `player_summary_stats.total_points_won` and `total_points_played`

---

## Top Partnership Rules

**Terminology:** "Top Partnership" (not "Best Partner"). "Top Partnerships" for the dashboard card.

**Eligibility:** Minimum 2 matches played together in the season.

**Ranking order:**
1. Win percentage (highest first)
2. Point differential — sum of (milton_score − opponent_score) across shared matches (highest first)
3. Average points conceded — opponent_score / matches_played (lowest first)
4. Matches played together (most first)

**Stats tracked per partnership:**
- Wins
- Losses
- Win % (wins / matches_played × 100, rounded to nearest integer)
- Points For (sum of milton_score)
- Points Against (sum of opponent_score)
- Point Differential (Points For − Points Against)
- Average Points Conceded (Points Against / matches_played)
- Matches Played (generated: wins + losses)

**Display:**
- Dashboard card columns: Partnership | Record (e.g. 5-1) | Win % (e.g. 83%)
- Players page card: shows top partnership name + record (e.g. "Alice Smith · 5-1")
- Player profile: shows top partnership name + record in stats row (no breakdown table)

---

## UI Guidelines
- Sports analytics style.
- Mobile-first, desktop-friendly.
- No public ranking language.

---

## FAQ Policy
The FAQ page is limited to topics directly relevant to Milton Pickleball, MPR ratings, match imports, and player analytics.

Removed permanently:
- "Is this DUPR?" — MPR stands on its own and does not need comparison to DUPR.
- "Why is there no public ranking?" — No ranking language is used anywhere in the app.
- "How often is the dashboard updated?" — Operational detail not relevant to players.

---

## Data Policy
- Do NOT generate sample players.
- Do NOT generate sample matches.
- Do NOT generate fake season data.
- The app will be tested using real Trillium 2026 data only.

---

## Empty State Requirements
Every page and dashboard section must handle empty data gracefully:
- If no players exist → show a friendly message (e.g. "No players added yet").
- If no matches exist → show a friendly message (e.g. "No matches recorded yet").
- If no ratings exist → show a friendly message (e.g. "Ratings will appear after matches are uploaded").
- Never show an error or broken UI just because a table is empty.
- Empty state messages must be calm, informative, and non-technical.

---

## Hosting & Infrastructure
| Service | Role       |
|---------|------------|
| Vercel  | Hosting    |
| Supabase | Database  |
| GitHub  | Source control |

---

## Development Workflow
- Build incrementally.
- Every step must be testable.
- After each step provide:
  1. What was built
  2. How to test it
  3. Expected results
  4. Known issues
- Stop after completing the step.
- Wait for approval before proceeding.
