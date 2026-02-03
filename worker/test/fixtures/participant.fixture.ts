import type { ChallengeParticipant } from "../../types";

let participantIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= participantIdCounter) {
      participantIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return participantIdCounter++;
}

export function createParticipant(
  overrides: Partial<ChallengeParticipant> = {},
): ChallengeParticipant {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    challenge_id: overrides.challenge_id ?? 1,
    user_id: overrides.user_id ?? 1,
    joined_at: overrides.joined_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetParticipantIdCounter(): void {
  participantIdCounter = 1;
}
