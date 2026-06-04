# Milton Player Rating (MPR)

Internal player analytics dashboard for Milton Pickleball Association players in Trillium League.

Ratings are DUPR-inspired but independent — focused on player development, not public ranking.

---

## Tech Stack

| Layer     | Tool                  |
|-----------|-----------------------|
| Framework | Next.js 15 App Router |
| Language  | TypeScript            |
| Styling   | Tailwind CSS          |
| Database  | Supabase              |
| Charts    | Recharts              |
| Hosting   | Vercel                |

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd ratings
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase project URL and anon key.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Routes

| Route             | Description                         |
|-------------------|-------------------------------------|
| `/dashboard`      | Season summary and leaderboards     |
| `/players`        | All Milton players list             |
| `/players/[id]`   | Individual player profile           |
| `/matches`        | Match history browser               |
| `/admin/upload`   | Upload match results (CSV/manual)   |

---

## Environment Variables

| Variable                         | Required | Description                              |
|----------------------------------|----------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | Yes      | Your Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Yes      | Supabase anon/public key                 |
| `SUPABASE_SERVICE_ROLE_KEY`      | No       | Server-side admin key (seeding/migrations)|

---

## CSV Import

Match results can be bulk-imported at **`/admin/upload`**.

### Required columns

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `date` | Yes | YYYY-MM-DD | `2026-05-27` |
| `week_number` | Yes | 1–8 | `1` |
| `division` | Yes | `4.0` · `3.5+` · `3.5-` | `4.0` |
| `match_type` | Yes | `mens_doubles` · `womens_doubles` · `mixed_doubles` | `mixed_doubles` |
| `opponent_club` | Yes | Free text | `Burlington Pickleball Club` |
| `player_1` | Yes | Display name | `Jane Smith` |
| `player_2` | Yes | Display name | `Bob Jones` |
| `milton_score` | Yes | Integer ≥ 0 | `2` |
| `opponent_score` | Yes | Integer ≥ 0, ≠ milton_score | `1` |

Download a pre-formatted template: [`/sample-csv-template.csv`](public/sample-csv-template.csv)

### How it works

1. Drag-and-drop or select your `.csv` file.
2. The app parses it and shows a **row-by-row preview** with validation errors highlighted.
3. Fix any errors in your spreadsheet and re-upload if needed.
4. Click **Import** — matches are processed in file order, running the rating engine after each one.
5. A summary shows new players created and per-player rating changes.

### Auto-player creation

If a player name is not found in the database, a new player is created automatically:
- **Starting rating** is assigned from their first division in the file (`4.0` → 4.00, `3.5+` → 3.50, `3.5-` → 3.25).
- **Gender** is inferred from match type (`mens_doubles` → Male, `womens_doubles` → Female, `mixed_doubles` → defaults to Male).
- Review auto-created players in Supabase and correct gender if needed for mixed-doubles-only players.

### Notes

- Matches are saved to the **active season**. Ensure a season is active before importing.
- Rows are processed in file order — earlier matches affect ratings for later matches.
- Duplicate detection is not automatic. Re-importing the same file will create duplicate matches.

---

## Analytics

Vercel Web Analytics is enabled via the `@vercel/analytics` package. The `<Analytics />` component is mounted in `src/app/layout.tsx` and automatically tracks page views across every route.

**No custom tracking code is needed.** Vercel handles data collection.

### Viewing analytics

1. Open your Vercel project dashboard at https://vercel.com
2. Select the **mpr-dashboard** project
3. Click the **Analytics** tab in the top navigation

### Available metrics

| Metric | Description |
|--------|-------------|
| Page views | Total views per page |
| Unique visitors | Distinct visitors per day/week/month |
| Top pages | Most visited routes (e.g. `/dashboard`, `/players`) |
| Referrers | Where visitors came from |
| Devices | Desktop vs mobile breakdown |
| Countries | Visitor geography |

> Analytics data only appears after the app is deployed to Vercel. It does not collect data in local development.

---

## Development Workflow

This project is built incrementally. Each step is approved before the next begins.
See `MPR_CONTEXT.md` for the full specification.
