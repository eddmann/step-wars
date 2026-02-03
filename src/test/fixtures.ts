import type {
  User,
  Challenge,
  Participant,
  StepEntry,
  UserGoals,
  Badge,
  PendingNotification,
  LeaderboardEntry,
  DaySummary,
  DayRanking,
  ChallengeMode,
  ChallengeStatus,
} from "../types";
import { getToday } from "../lib/utils";

let idCounter = 1;
const nextId = () => idCounter++;

function nextIdWithOverride(overrideId?: number) {
  if (overrideId !== undefined) {
    if (overrideId >= idCounter) {
      idCounter = overrideId + 1;
    }
    return overrideId;
  }
  return nextId();
}

export function resetIdCounter() {
  idCounter = 1;
}

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

export function createUser(overrides?: Partial<User>): User {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    email: "test@example.com",
    name: "Test User",
    timezone: "UTC",
    created_at: DEFAULT_NOW,
    updated_at: DEFAULT_NOW,
    ...overrides,
  };
}

export function createChallenge(overrides?: Partial<Challenge>): Challenge {
  const id = nextIdWithOverride(overrides?.id);
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 7);

  return {
    id,
    title: "Weekend Warriors",
    description: "Most steps wins",
    creator_id: 1,
    start_date: start.toISOString().split("T")[0],
    end_date: end.toISOString().split("T")[0],
    mode: "cumulative",
    invite_code: `CODE${id}`,
    status: "active",
    is_recurring: false,
    recurring_interval: null,
    created_at: DEFAULT_NOW,
    updated_at: DEFAULT_NOW,
    ...overrides,
  };
}

export function createParticipant(
  overrides?: Partial<Participant>,
): Participant {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    user_id: overrides?.user_id ?? 1,
    name: overrides?.name ?? "Test User",
    joined_at: overrides?.joined_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function createStepEntry(overrides?: Partial<StepEntry>): StepEntry {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    user_id: overrides?.user_id ?? 1,
    date: overrides?.date ?? getToday(),
    step_count: overrides?.step_count ?? 12345,
    source: overrides?.source ?? "manual",
    created_at: DEFAULT_NOW,
    updated_at: DEFAULT_NOW,
    ...overrides,
  };
}

export function createGoals(overrides?: Partial<UserGoals>): UserGoals {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    user_id: overrides?.user_id ?? 1,
    daily_target: overrides?.daily_target ?? 10000,
    weekly_target: overrides?.weekly_target ?? 70000,
    is_paused: overrides?.is_paused ?? false,
    paused_at: overrides?.paused_at ?? null,
    current_streak: overrides?.current_streak ?? 3,
    longest_streak: overrides?.longest_streak ?? 7,
    last_achieved_date: overrides?.last_achieved_date ?? null,
    created_at: DEFAULT_NOW,
    updated_at: DEFAULT_NOW,
    ...overrides,
  };
}

export function createBadge(overrides?: Partial<Badge>): Badge {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    user_id: overrides?.user_id ?? 1,
    badge_type: overrides?.badge_type ?? "daily_winner",
    challenge_id: overrides?.challenge_id ?? null,
    earned_at: overrides?.earned_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function createNotification(
  overrides?: Partial<PendingNotification>,
): PendingNotification {
  const id = nextIdWithOverride(overrides?.id);
  return {
    id,
    user_id: overrides?.user_id ?? 1,
    type: overrides?.type ?? "daily_win",
    title: overrides?.title ?? "Daily Winner!",
    message: overrides?.message ?? "You won today",
    badge_type: overrides?.badge_type ?? "daily_winner",
    challenge_id: overrides?.challenge_id ?? null,
    created_at: overrides?.created_at ?? DEFAULT_NOW,
    read_at: overrides?.read_at ?? null,
    ...overrides,
  };
}

export function createLeaderboardEntry(
  overrides?: Partial<LeaderboardEntry>,
): LeaderboardEntry {
  const userId = nextIdWithOverride(overrides?.user_id);
  return {
    rank: overrides?.rank ?? 1,
    user_id: userId,
    name: overrides?.name ?? `Player ${userId}`,
    total_steps: overrides?.total_steps ?? 12000,
    total_points: overrides?.total_points ?? 3,
    is_current_user: overrides?.is_current_user ?? false,
    last_finalized_steps: overrides?.last_finalized_steps ?? null,
    ...overrides,
  };
}

export function createDayRanking(overrides?: Partial<DayRanking>): DayRanking {
  const userId = nextIdWithOverride(overrides?.user_id);
  return {
    rank: overrides?.rank ?? 1,
    user_id: userId,
    name: overrides?.name ?? `Player ${userId}`,
    steps: overrides?.steps ?? 12000,
    points: overrides?.points ?? 3,
    is_current_user: overrides?.is_current_user ?? false,
    ...overrides,
  };
}

export function createDaySummary(
  overrides?: Partial<DaySummary & { rankings?: DayRanking[] }>,
): DaySummary {
  return {
    date: overrides?.date ?? new Date().toISOString().split("T")[0],
    status: overrides?.status ?? "finalized",
    rankings: overrides?.rankings ?? [createDayRanking({ rank: 1 })],
  };
}

export function createChallenges(
  count = 3,
  mode: ChallengeMode = "cumulative",
  status: ChallengeStatus = "active",
): Challenge[] {
  return Array.from({ length: count }, (_, i) =>
    createChallenge({
      id: i + 1,
      title: `Challenge ${i + 1}`,
      mode,
      status,
    }),
  );
}
