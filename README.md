# Step Wars

A fitness challenge app where users compete by tracking daily steps.

## Tech Stack

- **Frontend**: React 19, Redux Toolkit, React Router v7, Vite
- **Backend**: Cloudflare Workers, D1 (SQLite)
- **Styling**: CSS custom properties with iOS-inspired design

## Timezone Architecture

### Overview

Timezones are handled at multiple levels to ensure fairness in challenges while respecting each user's local time.

### 1. Users

Each user has a timezone stored in their profile (set at registration).

```
users.timezone = "America/Los_Angeles"
```

Used for personal step logging and dashboard display.

### 2. Challenges

Each challenge has its own timezone, inherited from the creator.

```
challenges.timezone = "America/Los_Angeles"
```

All participants see the same "day" boundaries for that challenge, regardless of their personal timezone.

### 3. Frontend

Uses browser timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.

- `getToday()` and `getYesterday()` return dates in the user's local timezone
- Ensures step submissions match the user's device clock

### 4. Leaderboard

Uses the **challenge's timezone** for all date calculations.

- Edit cutoff calculated in challenge timezone
- All participants see the same confirmed/pending boundaries
- Fair visibility rules regardless of participant location

### 5. Finalization (Cron Job)

Runs at noon UTC daily and processes each challenge according to its own timezone.

- Checks if it's past noon in each challenge's timezone before processing
- Daily points calculated only after edit window closes
- Challenges finalized only when end_date has passed in their timezone

### Example Flow

```
Challenge in America/Los_Angeles (UTC-8):
├── Created with timezone = "America/Los_Angeles"
├── User in Tokyo logs 10,000 steps for Jan 12 (Tokyo local date)
├── Cron runs at noon UTC (4am LA time) → skips this challenge
├── Cron runs again next day at noon UTC (now noon LA time)
│   └── Calculates daily points for Jan 11 (LA yesterday)
├── Leaderboard shows confirmed steps based on LA noon cutoff
```

### Key Principle

Everyone's "day" for a challenge ends at the same moment (midnight in the challenge's timezone), with the same edit window (until noon the next day in the challenge's timezone).

## Edit Window

Users can edit steps for:
- **Today**: Always editable
- **Yesterday**: Editable until noon (local time for dashboard, challenge time for challenges)

This prevents retroactive cheating while allowing reasonable corrections.

## Challenge Modes

- **cumulative**: Winner has the most total steps over the challenge period
- **daily_winner**: Points awarded daily (1st=3, 2nd=2, 3rd=1), winner has most points

## Development

```bash
# Install dependencies
npm install

# Run locally (frontend + worker)
npm run dev

# Apply migrations locally
npx wrangler d1 migrations apply step-wars-db --local

# Type check
npm run typecheck

# Build
npm run build
```

## Database Migrations

Migrations are in `/migrations`. Apply them with:

```bash
# Local
npx wrangler d1 migrations apply step-wars-db --local

# Remote
npx wrangler d1 migrations apply step-wars-db --remote
```
