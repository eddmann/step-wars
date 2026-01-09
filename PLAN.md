# Step Wars - Implementation Plan

## Executive Summary

Step Wars is a competitive step-tracking PWA that enables friends to challenge each other in friendly step-count competitions. The app combines personal fitness tracking (goals, streaks) with social competition (challenges, leaderboards, badges) while maintaining a native iOS Health app aesthetic.

---

## Project Analysis

### Current State
- **Directory**: `/Users/edd/Projects/step-wars-3` - Empty (greenfield project)
- **Reference**: `chickpea-guesses` provides architectural patterns to follow

### Reference Architecture (from chickpea-guesses)
| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Styling | Tailwind CSS 4 |
| Package Manager | Bun |
| Deployment | Cloudflare |

This stack is ideal for Step Wars - serverless, fast, and cost-effective for a social fitness app.

---

## Design Philosophy

### iOS Health App Aesthetic
The app should feel like a native iOS app, not a typical web app. Key principles:

1. **Activity Rings** - Circular progress indicators for daily/weekly goals
2. **Card-Based UI** - Rounded corners (16-20px), subtle shadows, layered depth
3. **SF-Style Typography** - System font stack or Inter for that native feel
4. **Bottom Tab Navigation** - 4-5 primary tabs like native iOS
5. **Warm, Encouraging Colors** - Greens for progress, golds for achievements
6. **Micro-animations** - Subtle transitions, haptic-style feedback
7. **Dark/Light Mode** - System preference + manual toggle

### Color Palette

```css
/* Light Mode */
--color-background: oklch(0.97 0.01 270);      /* #F2F2F7 - iOS system background */
--color-card: oklch(1 0 0);                     /* #FFFFFF */
--color-text-primary: oklch(0.13 0 0);          /* Near black */
--color-text-secondary: oklch(0.55 0 0);        /* Gray */

/* Dark Mode */
--color-background-dark: oklch(0.13 0.01 270);  /* #1C1C1E */
--color-card-dark: oklch(0.23 0.01 270);        /* #2C2C2E */

/* Brand Colors - Activity Ring Inspired */
--color-steps: oklch(0.75 0.18 145);            /* Vibrant green - primary action */
--color-steps-light: oklch(0.85 0.12 145);      /* Light green - backgrounds */
--color-challenge: oklch(0.72 0.15 230);        /* iOS blue - challenges */
--color-achievement: oklch(0.85 0.18 85);       /* Gold - badges/wins */
--color-streak: oklch(0.65 0.22 25);            /* Orange - streaks */

/* Podium Colors */
--color-gold: oklch(0.85 0.18 85);
--color-silver: oklch(0.75 0.02 270);
--color-bronze: oklch(0.65 0.12 55);
```

---

## Core Features Breakdown

### 1. User Authentication
- Email/password registration & login
- JWT-based session management
- Edit tokens for time-limited modifications (like chickpea-guesses)

### 2. Step Challenges
- **Create**: Title, description, start/end dates, competition mode
- **Modes**:
  - `daily_winner` - Points awarded to highest steps each day
  - `cumulative` - Total steps over challenge period
- **Invite System**: 6-character alphanumeric codes
- **Recurring**: Optional weekly/monthly auto-restart

### 3. Step Logging
- Manual entry (future: HealthKit/Android Health integration)
- **Edit Window**: Can log/edit until 12:00 noon the next day
- Quick date selection (Today/Yesterday buttons)
- Entry history per challenge

### 4. Leaderboards
- Real-time rankings computed from step entries
- Podium display (1st, 2nd, 3rd with medals)
- Daily points tracking for daily_winner mode
- Today's steps shown alongside totals

### 5. Personal Goals
- Daily step target (default: 10,000)
- Weekly step target (default: 70,000)
- Streak tracking (current + longest)
- Pause/resume without losing streak history

### 6. Badges & Achievements
- `daily_winner` - Won a day in a challenge
- `challenge_winner` - Won an entire challenge
- `streak_7`, `streak_14`, `streak_30` - Goal streak milestones

---

## Database Schema

### Tables Overview

```
users
├── id, email, name, password_hash
├── created_at, updated_at
└── Indexes: email (unique)

challenges
├── id, title, description, creator_id
├── start_date, end_date, mode
├── invite_code (unique), status
├── is_recurring, recurring_interval
├── created_at, updated_at
└── Indexes: invite_code, creator_id, status

challenge_participants
├── id, challenge_id, user_id, joined_at
└── Unique constraint: (challenge_id, user_id)

step_entries
├── id, user_id, challenge_id
├── date, step_count
├── created_at, updated_at
└── Unique constraint: (user_id, challenge_id, date)

daily_points (for daily_winner mode)
├── id, challenge_id, user_id, date, points
└── Unique constraint: (challenge_id, user_id, date)

user_goals
├── id, user_id
├── daily_target, weekly_target
├── is_paused, paused_at
├── current_streak, longest_streak, last_achieved_date
└── created_at, updated_at

user_badges
├── id, user_id, badge_type, challenge_id
├── earned_at
└── Unique constraint: (user_id, badge_type, challenge_id)

sessions (for auth)
├── id, user_id, token, expires_at, created_at
└── Indexes: token, user_id
```

### Detailed Schema SQL

```sql
-- 0001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 0002_create_sessions.sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 0003_create_challenges.sql
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('daily_winner', 'cumulative')),
  invite_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'monthly', NULL)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_challenges_invite_code ON challenges(invite_code);
CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

-- 0004_create_challenge_participants.sql
CREATE TABLE IF NOT EXISTS challenge_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON challenge_participants(user_id);

-- 0005_create_step_entries.sql
CREATE TABLE IF NOT EXISTS step_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  step_count INTEGER NOT NULL CHECK (step_count >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, challenge_id, date)
);
CREATE INDEX IF NOT EXISTS idx_entries_challenge_date ON step_entries(challenge_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_user ON step_entries(user_id);

-- 0006_create_daily_points.sql
CREATE TABLE IF NOT EXISTS daily_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  UNIQUE(challenge_id, user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_daily_points_challenge ON daily_points(challenge_id, date);

-- 0007_create_user_goals.sql
CREATE TABLE IF NOT EXISTS user_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  daily_target INTEGER NOT NULL DEFAULT 10000,
  weekly_target INTEGER NOT NULL DEFAULT 70000,
  is_paused INTEGER NOT NULL DEFAULT 0,
  paused_at TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_achieved_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 0008_create_user_badges.sql
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'daily_winner', 'challenge_winner',
    'streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_100'
  )),
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_type, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);
```

---

## API Architecture

### Authentication Endpoints
```
POST /api/auth/register
  Body: { email, name, password }
  Returns: { user, token }

POST /api/auth/login
  Body: { email, password }
  Returns: { user, token }

POST /api/auth/logout
  Headers: Authorization: Bearer {token}
  Returns: { success: true }

GET /api/auth/me
  Headers: Authorization: Bearer {token}
  Returns: { user }
```

### Challenge Endpoints
```
GET /api/challenges
  Headers: Authorization: Bearer {token}
  Returns: { challenges: Challenge[] }  (user's challenges)

POST /api/challenges
  Headers: Authorization: Bearer {token}
  Body: { title, description?, start_date, end_date, mode, is_recurring?, recurring_interval? }
  Returns: { challenge }

GET /api/challenges/:id
  Headers: Authorization: Bearer {token}
  Returns: { challenge, participants, userEntry? }

POST /api/challenges/join
  Headers: Authorization: Bearer {token}
  Body: { invite_code }
  Returns: { challenge }

GET /api/challenges/:id/leaderboard
  Headers: Authorization: Bearer {token}
  Returns: { leaderboard: LeaderboardEntry[] }
```

### Step Entry Endpoints
```
GET /api/challenges/:id/entries
  Headers: Authorization: Bearer {token}
  Query: ?user_id={id}  (optional, defaults to current user)
  Returns: { entries: StepEntry[] }

POST /api/challenges/:id/entries
  Headers: Authorization: Bearer {token}
  Body: { date, step_count }
  Returns: { entry }
  Validation: date must be today or yesterday (before noon)

PUT /api/challenges/:id/entries/:date
  Headers: Authorization: Bearer {token}
  Body: { step_count }
  Returns: { entry }
  Validation: within edit window (noon next day)
```

### Goals Endpoints
```
GET /api/goals
  Headers: Authorization: Bearer {token}
  Returns: { goals, streak }

PUT /api/goals
  Headers: Authorization: Bearer {token}
  Body: { daily_target?, weekly_target?, is_paused? }
  Returns: { goals }

GET /api/goals/history
  Headers: Authorization: Bearer {token}
  Query: ?days=30
  Returns: { history: DailyGoalStatus[] }
```

### Profile Endpoints
```
GET /api/profile
  Headers: Authorization: Bearer {token}
  Returns: { user, stats, badges }

PUT /api/profile
  Headers: Authorization: Bearer {token}
  Body: { name?, email? }
  Returns: { user }

GET /api/profile/badges
  Headers: Authorization: Bearer {token}
  Returns: { badges: Badge[] }
```

---

## Frontend Architecture

### Directory Structure

```
src/
├── components/
│   ├── ui/                      # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── RingProgress.tsx     # Activity ring component
│   │   ├── TabBar.tsx           # Bottom navigation
│   │   ├── Podium.tsx           # 1st/2nd/3rd display
│   │   ├── DatePicker.tsx
│   │   ├── Toast.tsx
│   │   └── Icons.tsx
│   │
│   ├── layout/
│   │   ├── AppShell.tsx         # Main app wrapper with tab bar
│   │   ├── Header.tsx
│   │   └── PageContainer.tsx
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── AuthGuard.tsx
│   │
│   ├── challenges/
│   │   ├── ChallengeCard.tsx
│   │   ├── ChallengeList.tsx
│   │   ├── CreateChallengeForm.tsx
│   │   ├── JoinChallengeModal.tsx
│   │   ├── InviteCodeShare.tsx
│   │   └── ChallengeStatusBadge.tsx
│   │
│   ├── steps/
│   │   ├── StepEntryForm.tsx
│   │   ├── StepHistory.tsx
│   │   ├── DailyStepCard.tsx
│   │   └── QuickDateButtons.tsx
│   │
│   ├── leaderboard/
│   │   ├── LeaderboardList.tsx
│   │   ├── LeaderboardRow.tsx
│   │   └── PodiumDisplay.tsx
│   │
│   ├── goals/
│   │   ├── GoalRing.tsx         # Main activity ring
│   │   ├── StreakDisplay.tsx
│   │   ├── GoalSettings.tsx
│   │   └── WeeklyProgress.tsx
│   │
│   └── profile/
│       ├── ProfileHeader.tsx
│       ├── BadgeGrid.tsx
│       ├── StatsGrid.tsx
│       └── EditProfileForm.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useChallenges.ts
│   ├── useChallenge.ts
│   ├── useSteps.ts
│   ├── useGoals.ts
│   ├── useLeaderboard.ts
│   ├── useProfile.ts
│   └── useTheme.ts
│
├── pages/
│   ├── Dashboard.tsx            # Home - today's stats, active challenges
│   ├── Challenges.tsx           # Challenge list
│   ├── ChallengeDetail.tsx      # Single challenge view
│   ├── Goals.tsx                # Personal goals & streaks
│   ├── Profile.tsx              # User profile & badges
│   ├── Login.tsx
│   └── Register.tsx
│
├── lib/
│   ├── api.ts                   # API client
│   ├── constants.ts
│   ├── utils.ts
│   └── date-utils.ts            # Edit window calculations
│
├── types/
│   └── index.ts
│
├── contexts/
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
│
├── index.css                    # Tailwind + theme variables
├── main.tsx
└── App.tsx                      # Router setup
```

### Key Component Designs

#### RingProgress (Activity Ring)
```tsx
// Circular progress indicator like Apple Watch activity rings
// SVG-based with smooth animations
// Supports multiple nested rings for daily/weekly
interface RingProgressProps {
  value: number;        // 0-100
  max: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  label?: string;
  children?: ReactNode; // Center content
}
```

#### TabBar (Bottom Navigation)
```tsx
// Fixed bottom navigation, 5 tabs max
// Icons from SF Symbols style (lucide-react)
// Active state with filled icon + color
const tabs = [
  { icon: Home, label: 'Today', path: '/' },
  { icon: Trophy, label: 'Challenges', path: '/challenges' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: User, label: 'Profile', path: '/profile' },
];
```

#### Podium Display
```tsx
// 3-column podium for top 3 in leaderboard
// 2nd | 1st | 3rd arrangement (1st elevated)
// Medal icons: 🥇 🥈 🥉 or custom SVGs
// Avatar, name, step count for each
```

### Page Layouts

#### Dashboard (Home)
```
┌─────────────────────────────┐
│  Good morning, {name}       │
├─────────────────────────────┤
│  ┌─────────────────────┐    │
│  │   [Activity Ring]    │    │  Today's Steps
│  │      8,432          │    │  Goal: 10,000
│  │   steps today       │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  🔥 5 day streak            │
├─────────────────────────────┤
│  Active Challenges          │
│  ┌─────────────────────┐    │
│  │ Weekend Warriors    │    │
│  │ You're in 2nd!      │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │ Office Step-Off     │    │
│  │ You're winning!     │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  [Tab Bar]                  │
└─────────────────────────────┘
```

#### Challenge Detail
```
┌─────────────────────────────┐
│  ← Back    Weekend Warriors │
├─────────────────────────────┤
│  Mode: Daily Winner         │
│  Jan 1 - Jan 31            │
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │     [Podium]          │  │
│  │   2nd  1st  3rd       │  │
│  │   You  Sam  Alex      │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Full Leaderboard           │
│  1. Sam      12,345  🥇     │
│  2. You      11,234  🥈     │
│  3. Alex     10,123  🥉     │
│  4. Jordan    9,876         │
├─────────────────────────────┤
│  [Log Today's Steps]        │  Floating action button
├─────────────────────────────┤
│  [Tab Bar]                  │
└─────────────────────────────┘
```

---

## Business Logic

### Edit Window Calculation
```typescript
// Can edit steps for a date until 12:00 noon the NEXT day
function canEditStepsForDate(date: string): boolean {
  const entryDate = new Date(date);
  const deadline = new Date(entryDate);
  deadline.setDate(deadline.getDate() + 1);
  deadline.setHours(12, 0, 0, 0);

  return new Date() < deadline;
}

// For "Today" button - shows if today is editable
// For "Yesterday" button - shows if yesterday is still editable
```

### Daily Winner Points Calculation
```typescript
// Run at end of each day (or on-demand)
// Awards points based on rank:
// 1st place: 3 points
// 2nd place: 2 points
// 3rd place: 1 point
// Others: 0 points

async function calculateDailyPoints(challengeId: number, date: string) {
  const entries = await getEntriesForDate(challengeId, date);
  const sorted = entries.sort((a, b) => b.step_count - a.step_count);

  const points = [3, 2, 1];
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    await awardPoints(challengeId, sorted[i].user_id, date, points[i]);
  }
}
```

### Streak Calculation
```typescript
// Check if user met their daily goal
// Streak continues if goal met OR goal is paused
async function updateStreak(userId: number, date: string, stepCount: number) {
  const goals = await getUserGoals(userId);
  if (goals.is_paused) return; // Paused goals don't break streaks

  const metGoal = stepCount >= goals.daily_target;

  if (metGoal) {
    goals.current_streak++;
    goals.last_achieved_date = date;
    if (goals.current_streak > goals.longest_streak) {
      goals.longest_streak = goals.current_streak;
      // Check for streak badges
      await checkStreakBadges(userId, goals.current_streak);
    }
  } else {
    goals.current_streak = 0;
  }

  await updateUserGoals(userId, goals);
}
```

### Invite Code Generation
```typescript
// 6-character alphanumeric, uppercase
// Avoids ambiguous characters (0, O, I, 1, L)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => CHARS[b % CHARS.length])
    .join('');
}
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
1. Project setup with Vite + React 19 + TypeScript
2. Cloudflare Workers configuration
3. D1 database setup with migrations
4. Tailwind CSS 4 with custom theme
5. Basic auth (register, login, sessions)
6. UI primitives (Button, Card, Input, Modal)
7. App shell with tab navigation

**Files to create:**
- `package.json`, `vite.config.ts`, `tsconfig.json`
- `wrangler.json`
- `migrations/0001_create_users.sql` through `0008_...`
- `src/index.css` (theme)
- `src/components/ui/*.tsx`
- `src/components/layout/AppShell.tsx`, `TabBar.tsx`
- `worker/index.ts`, `worker/db/queries.ts`
- `worker/routes/auth.ts`

### Phase 2: Personal Features (Goals & Steps)
1. User goals system (daily/weekly targets)
2. Activity ring component
3. Streak tracking
4. Goals page with settings
5. Dashboard with today's summary

**Files to create:**
- `src/components/goals/*.tsx`
- `src/pages/Dashboard.tsx`, `Goals.tsx`
- `src/hooks/useGoals.ts`
- `worker/routes/goals.ts`

### Phase 3: Challenges Core
1. Challenge CRUD operations
2. Invite code system (create, join)
3. Challenge list and detail pages
4. Step entry form with edit window
5. Entry history

**Files to create:**
- `src/components/challenges/*.tsx`
- `src/components/steps/*.tsx`
- `src/pages/Challenges.tsx`, `ChallengeDetail.tsx`
- `src/hooks/useChallenges.ts`, `useSteps.ts`
- `worker/routes/challenges.ts`, `entries.ts`

### Phase 4: Competition Features
1. Leaderboard calculations
2. Podium display component
3. Daily winner point system
4. Real-time rankings

**Files to create:**
- `src/components/leaderboard/*.tsx`
- `src/hooks/useLeaderboard.ts`
- `worker/routes/leaderboard.ts`
- `worker/db/leaderboard-queries.ts`

### Phase 5: Achievements & Polish
1. Badge system
2. Profile page with stats
3. Badge grid display
4. Celebration animations (confetti)
5. Dark/light theme toggle
6. PWA manifest and service worker

**Files to create:**
- `src/components/profile/*.tsx`
- `src/pages/Profile.tsx`
- `src/contexts/ThemeContext.tsx`
- `public/manifest.json`
- `public/sw.js`

### Phase 6: Future Enhancements (Not in initial scope)
- HealthKit/Android Health integration
- Social features (banter, kudos, comments)
- Push notifications
- Recurring challenges auto-restart
- Challenge templates

---

## Open Questions & Decisions Needed

### 1. Authentication Method
**Options:**
- A) Simple email/password (like chickpea-guesses)
- B) OAuth (Google, Apple Sign-In)
- C) Magic link (passwordless)

**Recommendation:** Start with email/password for simplicity, add OAuth later.

### 2. Step Entry Source
**Current:** Manual entry only
**Future:** HealthKit, Google Fit, Garmin, Strava

Should we design the schema to support multiple sources now?
```sql
step_entries.source TEXT DEFAULT 'manual' -- 'manual', 'healthkit', 'google_fit'
```

### 3. Timezone Handling
Steps are date-based. Should we:
- A) Use user's local timezone (store timezone in profile)
- B) Use UTC everywhere
- C) Use server timezone

**Recommendation:** Store user timezone, display in local time, calculate edit windows in local time.

### 4. Challenge Visibility
- A) All challenges are private (invite-only)
- B) Option for public challenges anyone can join
- C) Discoverable challenges within a "group" or "team"

**Recommendation:** Start private-only, add public later.

### 5. Points System (Daily Winner)
Current proposal: 3/2/1 for 1st/2nd/3rd
Alternatives:
- Proportional to participant count
- Winner-takes-all
- Points for beating your personal average

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edit window abuse (logging unrealistic steps) | Medium | Medium | Add reasonable max (e.g., 100,000 steps/day) |
| Timezone confusion | High | Low | Clear UI showing which day you're logging |
| Leaderboard performance at scale | Low | Medium | Add caching, computed fields |
| PWA not feeling native enough | Medium | High | Extensive design attention, animations |

---

## Success Metrics

1. **Engagement:** Daily active users logging steps
2. **Retention:** Users maintaining streaks > 7 days
3. **Social:** Average participants per challenge > 3
4. **Completion:** % of challenges that reach end date with activity

---

## Sources & References

- [Apple HealthKit Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/healthkit)
- [iOS App Design 2025 Trends](https://bix-tech.com/designing-ios-apps-2025-guide-modern-creators/)
- [Healthcare UI Design Best Practices](https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications)
- [Mobile App Design Patterns for Retention](https://procreator.design/blog/mobile-app-design-patterns-boost-retention/)
