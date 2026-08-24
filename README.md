# 🎮 Arcade Track 2026

A bold glassmorphism dashboard for Google Cloud Arcade 2026 (GCAF · Jul 13 – Sep 14, 2026).

Paste your public Skills Boost profile URL and immediately see:
- **Arcade Points** — game badges (+1) and skill badges (+0.5) for the active period
- **Tier Eligibility** — Trooper (50+) → Ranger (75+) → Champion (95+) → Legend (120+)
- **Facilitator Milestones** — M1 (+5 pts), M2 (+15 pts), Ultimate (+25 pts) progress bars
- **Active July 2026 Tracks** — the six monthly game tracks with completion status
- **FastTrack Catalog** — 35+ skill badges searchable by name, difficulty, and category
- **Live Leaderboard** — real-time Supabase subscription with a podium and full rankings

---!ArcadeTrack!

## Quick start

```bash
git clone <repo>
cd ArcadeTrack2026
cp .env.local.example .env.local  # fill in your Supabase credentials
npm install
npm run dev          # → http://localhost:3000
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only service role key (never exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚡ recommended | Anon public key — enables real-time leaderboard updates |

Copy `.env.local.example` → `.env.local` and fill in the values from your Supabase project's **Settings → API** page.

---

## Supabase setup

1. **Create tables** — paste the SQL from `.env.local.example` into the Supabase SQL editor.
2. **Enable Realtime** — Database → Tables → `participants` → Replication → enable Realtime.
3. **RLS policy** — add an anon SELECT policy on `participants` so the leaderboard works without the service role key in the browser.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4, custom glassmorphism CSS |
| Database | Supabase (PostgreSQL) |
| Real-time | Supabase Channels / postgres_changes |
| Scraping | Cheerio (server-side) |
| Icons | Radix UI Icons |
| Font | Geist Sans + JetBrains Mono |

---

## Arcade 2026 scoring

| Badge type | Arcade Points |
|---|---|
| Game badge (any track) | +1.0 |
| Skill badge | +0.5 |

**Facilitator bonus** (GCAF only):

| Milestone | Requirement | Bonus |
|---|---|---|
| Milestone 1 | 1 game + 7 skills | +5 pts |
| Milestone 2 | 3 games + 14 skills | +15 pts |
| Ultimate | 8 games + 28 skills | +25 pts |

**Tier thresholds** (total points including bonus):

| Tier | Points needed |
|---|---|
| Arcade Trooper | 50+ |
| Arcade Ranger | 75+ |
| Arcade Champion | 95+ |
| Arcade Legend | 120+ |

---

## Project structure

```
src/
├── app/
│   ├── globals.css          # Dark glassmorphism theme
│   ├── layout.tsx
│   ├── page.tsx             # Login + view orchestrator
│   └── api/
│       ├── participants/    # CRUD + sync endpoint
│       ├── scrape/          # Cheerio scraper
│       └── skills/          # Skill badge catalog
├── components/
│   ├── Header.tsx           # Glass navbar + live clock
│   ├── ProfileHeader.tsx    # Avatar + quick stats
│   ├── Dashboard.tsx        # Points, tier, milestones, tracks, catalog, badges
│   ├── FacilitatorPanel.tsx # Real-time Supabase leaderboard
│   ├── DashboardSkeleton.tsx
│   └── Toast.tsx
└── lib/
    ├── db.ts                # Server-side Supabase client + helpers
    └── supabase-client.ts   # Browser-safe Supabase client (real-time)
```
