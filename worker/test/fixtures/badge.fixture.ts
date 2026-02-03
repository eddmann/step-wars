import type { UserBadge } from "../../types";

let badgeIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= badgeIdCounter) {
      badgeIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return badgeIdCounter++;
}

export function createUserBadge(overrides: Partial<UserBadge> = {}): UserBadge {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    user_id: overrides.user_id ?? 1,
    badge_type: overrides.badge_type ?? "daily_winner",
    earned_at: overrides.earned_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetBadgeIdCounter(): void {
  badgeIdCounter = 1;
}
