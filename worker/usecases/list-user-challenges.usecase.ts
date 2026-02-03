import type { Challenge } from "../types";
import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";

export interface ListUserChallengesDeps {
  challengeRepository: ChallengeRepository;
}

export interface ListUserChallengesInput {
  userId: number;
}

export async function listUserChallenges(
  deps: ListUserChallengesDeps,
  input: ListUserChallengesInput,
): Promise<
  Result<(Challenge & { participant_count: number })[], UseCaseError>
> {
  const challenges = await deps.challengeRepository.listForUser(input.userId);
  return ok(challenges);
}
