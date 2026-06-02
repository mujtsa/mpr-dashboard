# MPR Deployment Guide

Milton Player Rating — Deployment to GitHub + Vercel + Supabase

Production URL: **https://mpr-dashboard.vercel.app**

---

## Prerequisites

- Node.js 18+
- Git installed
- GitHub account
- Vercel account (free tier is fine)
- Supabase project already created and configured (tables exist, season seeded)

---

## 1. GitHub Setup

### 1a. Initialise the repository (if not already a git repo)

```bash
cd ratings
git init
git add .
git commit -m "Initial commit — Milton Player Rating (MPR)"
```

### 1b. Create the GitHub repository

1. Go to https://github.com/new
2. Repository name: `mpr-dashboard` (or your preferred name)
3. Set to **Private** (recommended — this is an internal tool)
4. Do NOT initialise with README, .gitignore, or licence (you already have them)
5. Click **Create repository**

### 1c. Push to GitHub

```bash
git remote add origin https://github.com/<your-org-or-username>/mpr-dashboard.git
git branch -M main
git push -u origin main
```

---

## 2. Vercel Setup

### 2a. Create the Vercel project

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select your GitHub account and choose `mpr-dashboard`
4. Click **Import**

### 2b. Project configuration

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `.` (leave as default) |
| Build Command | `npm run build` (auto-detected) |
| Output Directory | `.next` (auto-detected) |
| Install Command | `npm install` (auto-detected) |

### 2c. Set the subdomain (optional)

In Vercel project settings → Domains:
- Request the subdomain `mpr-dashboard` → `mpr-dashboard.vercel.app`
- Or use the auto-generated URL until a custom domain is set

### 2d. Add environment variables

In Vercel project settings → **Environment Variables**, add:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (your anon key) | Production, Preview, Development |

> **Note:** Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel unless you need server-side admin operations. The anon key is sufficient for the current feature set.

### 2e. Deploy

Click **Deploy**. The first deployment takes ~2 minutes.

Subsequent deployments happen automatically when you push to `main`.

---

## 3. Supabase Production Checklist

Before testing the live app, verify the following in your Supabase dashboard:

### 3a. Tables exist

Run this in the SQL Editor to confirm all 6 tables are present:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected: `matches`, `partner_summary_stats`, `player_summary_stats`, `players`, `rating_history`, `seasons`

### 3b. Active season exists

```sql
SELECT * FROM seasons WHERE is_active = true;
```

Expected: exactly one row (Trillium 2026).

### 3c. Row Level Security is off

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All `rowsecurity` values should be `false`. If any are `true`, run:

```sql
ALTER TABLE seasons               DISABLE ROW LEVEL SECURITY;
ALTER TABLE players               DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches               DISABLE ROW LEVEL SECURITY;
ALTER TABLE rating_history        DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_summary_stats  DISABLE ROW LEVEL SECURITY;
ALTER TABLE partner_summary_stats DISABLE ROW LEVEL SECURITY;
```

### 3d. Migration columns applied

Confirm the two recent migrations have been applied:

```sql
-- Opponent player columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'matches'
  AND column_name IN ('opponent_player_1', 'opponent_player_2');

-- Partnership point columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'partner_summary_stats'
  AND column_name IN ('points_for', 'points_against');

-- Player point stat columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'player_summary_stats'
  AND column_name IN ('total_points_won', 'total_points_played');
```

If any columns are missing, run the relevant migration from `supabase/migrations/`.

---

## 4. Post-Deployment Testing Checklist

Open **https://mpr-dashboard.vercel.app** and verify each item:

### Core pages

- [ ] `/` redirects to `/dashboard`
- [ ] `/dashboard` loads without errors — shows season summary bar
- [ ] `/players` loads — shows empty state or player cards
- [ ] `/players/[id]` loads for any existing player
- [ ] `/faq` loads — shows 9 FAQ entries
- [ ] `/matches` redirects to `/dashboard`

### Admin pages (direct URL only — not in nav)

- [ ] `/admin/match-entry` loads — shows form or "no players" empty state
- [ ] `/admin/upload` loads — shows CSV upload + Recalculate section
- [ ] `/admin/recalculate` server action triggers correctly

### Functionality

- [ ] Add a player directly in Supabase, then reload `/players` — player card appears
- [ ] Enter a match via `/admin/match-entry` — success message with rating change shows
- [ ] Dashboard updates after match entry (within 60 seconds or on manual reload)
- [ ] CSV upload: upload `public/sample-csv-template.csv` (with real player names) — import completes
- [ ] Player profile `/players/[id]` shows rating trend chart, match history, and top partnership
- [ ] Match Results section on dashboard filters correctly
- [ ] Pagination on Match Results works (after enough matches are entered)

### Responsive / layout

- [ ] Mobile (375px): nav collapses to hamburger, player cards stack, match cards stack
- [ ] Tablet (768px): 2-column player grid
- [ ] Desktop (1280px): full layout with sidebar sections

### Supabase connection

- [ ] No "Failed to fetch" or Supabase errors in browser console
- [ ] Ratings update in `players` table after entering a match
- [ ] `rating_history` rows are created after each match

---

## 5. Environment Variables Reference

| Variable | Required | Where Used |
|----------|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | All Supabase queries (client + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | All Supabase queries (client + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-side admin operations only (optional) |

---

## 6. Continuous Deployment

After the initial setup, every `git push origin main` triggers an automatic Vercel deployment.

To deploy a hotfix:

```bash
git add .
git commit -m "fix: description of change"
git push origin main
```

Vercel will build and deploy within ~2 minutes.

---

## 7. Known Production Considerations

| Item | Detail |
|------|--------|
| **Supabase free tier** | 500 MB storage, 50,000 rows, 2 GB bandwidth/month — sufficient for a single-club Trillium season |
| **Vercel free tier** | 100 GB bandwidth/month, unlimited deployments — sufficient |
| **Dashboard revalidation** | Dashboard + Players pages revalidate every 60 seconds on Vercel; a full page reload will always show the latest data |
| **Admin page security** | Admin pages at `/admin/*` are accessible to anyone with the URL — no authentication is currently implemented. For a private deployment this is acceptable; add auth before any public exposure |
| **CSV re-import risk** | No duplicate detection — uploading the same CSV twice will create duplicate matches. Always verify in Supabase before re-importing |
