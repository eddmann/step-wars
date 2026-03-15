import type { Reaction } from "../../types";

let reactionIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= reactionIdCounter) {
      reactionIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return reactionIdCounter++;
}

export function createReaction(overrides: Partial<Reaction> = {}): Reaction {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    reactor_user_id: overrides.reactor_user_id ?? 1,
    target_user_id: overrides.target_user_id ?? 2,
    challenge_id: overrides.challenge_id ?? 1,
    date: overrides.date ?? "2026-01-01",
    reaction_type: overrides.reaction_type ?? "fire",
    created_at: overrides.created_at ?? DEFAULT_NOW,
  };
}

export function resetReactionIdCounter(): void {
  reactionIdCounter = 1;
}
