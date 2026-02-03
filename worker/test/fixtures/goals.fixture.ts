import type { UserGoals } from "../../types";

let goalsIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= goalsIdCounter) {
      goalsIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return goalsIdCounter++;
}

export function createUserGoals(overrides: Partial<UserGoals> = {}): UserGoals {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    user_id: overrides.user_id ?? 1,
    daily_target: overrides.daily_target ?? 10000,
    weekly_target: overrides.weekly_target ?? 70000,
    is_paused: overrides.is_paused ?? 0,
    paused_at: overrides.paused_at ?? null,
    current_streak: overrides.current_streak ?? 0,
    longest_streak: overrides.longest_streak ?? 0,
    last_achieved_date: overrides.last_achieved_date ?? null,
    created_at: overrides.created_at ?? DEFAULT_NOW,
    updated_at: overrides.updated_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetGoalsIdCounter(): void {
  goalsIdCounter = 1;
}
