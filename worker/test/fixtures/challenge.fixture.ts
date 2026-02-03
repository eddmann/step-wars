import type { Challenge } from "../../types";

let challengeIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= challengeIdCounter) {
      challengeIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return challengeIdCounter++;
}

export function createChallenge(overrides: Partial<Challenge> = {}): Challenge {
  const id = nextIdWithOverride(overrides.id);
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 7);

  return {
    id,
    title: overrides.title ?? `Challenge ${id}`,
    description: overrides.description ?? null,
    creator_id: overrides.creator_id ?? 1,
    start_date: overrides.start_date ?? start.toISOString().split("T")[0],
    end_date: overrides.end_date ?? end.toISOString().split("T")[0],
    mode: overrides.mode ?? "daily_winner",
    invite_code: overrides.invite_code ?? `INVITE${id}`,
    status: overrides.status ?? "pending",
    timezone: overrides.timezone ?? "UTC",
    is_recurring: overrides.is_recurring ?? 0,
    recurring_interval: overrides.recurring_interval ?? null,
    created_at: overrides.created_at ?? DEFAULT_NOW,
    updated_at: overrides.updated_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetChallengeIdCounter(): void {
  challengeIdCounter = 1;
}
