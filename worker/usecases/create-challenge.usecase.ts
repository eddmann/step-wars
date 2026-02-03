import type { Challenge } from "../types";
import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";
import { generateInviteCode } from "../../shared/constants";

export interface CreateChallengeDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
}

export interface CreateChallengeInput {
  creatorId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  mode: "daily_winner" | "cumulative";
  timezone: string;
  isRecurring: boolean;
  recurringInterval: "weekly" | "monthly" | null;
}

export async function createChallenge(
  deps: CreateChallengeDeps,
  input: CreateChallengeInput,
): Promise<Result<Challenge, UseCaseError>> {
  const inviteCode = generateInviteCode();

  const challenge = await deps.challengeRepository.create({
    title: input.title,
    description: input.description,
    creatorId: input.creatorId,
    startDate: input.startDate,
    endDate: input.endDate,
    mode: input.mode,
    inviteCode,
    timezone: input.timezone,
    isRecurring: input.isRecurring,
    recurringInterval: input.recurringInterval,
  });

  await deps.participantRepository.join(challenge.id, input.creatorId);

  return ok(challenge);
}
