import type { PendingNotification } from "../../types";

let notificationIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= notificationIdCounter) {
      notificationIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return notificationIdCounter++;
}

export function createNotification(
  overrides: Partial<PendingNotification> = {},
): PendingNotification {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    user_id: overrides.user_id ?? 1,
    type: overrides.type ?? "badge_earned",
    title: overrides.title ?? "Badge!",
    message: overrides.message ?? "You earned a badge",
    badge_type: overrides.badge_type ?? null,
    challenge_id: overrides.challenge_id ?? null,
    created_at: overrides.created_at ?? DEFAULT_NOW,
    read_at: overrides.read_at ?? null,
    ...overrides,
  };
}

export function resetNotificationIdCounter(): void {
  notificationIdCounter = 1;
}
