import type { Challenge } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { notFound, forbidden } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type {
  ParticipantRepository,
  ChallengeParticipantRow,
} from "../repositories/interfaces/participant.repository";

export interface GetChallengeDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
}

export interface GetChallengeInput {
  userId: number;
  challengeId: number;
}

export interface GetChallengeResult {
  challenge: Challenge;
  participants: ChallengeParticipantRow[];
}

export async function getChallenge(
  deps: GetChallengeDeps,
  input: GetChallengeInput,
): Promise<Result<GetChallengeResult, UseCaseError>> {
  const challenge = await deps.challengeRepository.getById(input.challengeId);
  if (!challenge) {
    return err(notFound("Challenge", input.challengeId));
  }

  const participant = await deps.participantRepository.isParticipant(
    input.challengeId,
    input.userId,
  );
  if (!participant) {
    return err(forbidden("Not a participant in this challenge"));
  }

  const participants = await deps.participantRepository.listParticipants(
    input.challengeId,
  );

  return ok({ challenge, participants });
}
