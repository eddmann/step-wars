import type { DailyPoints } from "../../types";

let dailyPointsIdCounter = 1;

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= dailyPointsIdCounter) {
      dailyPointsIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return dailyPointsIdCounter++;
}

export function createDailyPoints(
  overrides: Partial<DailyPoints> = {},
): DailyPoints {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    challenge_id: overrides.challenge_id ?? 1,
    user_id: overrides.user_id ?? 1,
    date: overrides.date ?? "2026-01-01",
    points: overrides.points ?? 3,
    ...overrides,
  };
}

export function resetDailyPointsIdCounter(): void {
  dailyPointsIdCounter = 1;
}
