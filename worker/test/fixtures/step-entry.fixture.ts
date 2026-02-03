import type { StepEntry } from "../../types";

let stepEntryIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= stepEntryIdCounter) {
      stepEntryIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return stepEntryIdCounter++;
}

export function createStepEntry(overrides: Partial<StepEntry> = {}): StepEntry {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    user_id: overrides.user_id ?? 1,
    date: overrides.date ?? "2026-01-01",
    step_count: overrides.step_count ?? 1000,
    source: overrides.source ?? "manual",
    created_at: overrides.created_at ?? DEFAULT_NOW,
    updated_at: overrides.updated_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetStepEntryIdCounter(): void {
  stepEntryIdCounter = 1;
}
