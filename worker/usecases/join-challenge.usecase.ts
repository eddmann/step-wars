import type { Challenge } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { conflict } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";

export interface JoinChallengeDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
}

export interface JoinChallengeInput {
  userId: number;
  inviteCode: string;
}

export async function joinChallenge(
  deps: JoinChallengeDeps,
  input: JoinChallengeInput,
): Promise<Result<Challenge, UseCaseError>> {
  const challenge = await deps.challengeRepository.getByInviteCode(
    input.inviteCode,
  );
  if (!challenge) {
    return err({ code: "NOT_FOUND", message: "Invalid invite code" });
  }

  const alreadyJoined = await deps.participantRepository.isParticipant(
    challenge.id,
    input.userId,
  );
  if (alreadyJoined) {
    return err(conflict("Already a participant in this challenge"));
  }

  await deps.participantRepository.join(challenge.id, input.userId);

  return ok(challenge);
}
