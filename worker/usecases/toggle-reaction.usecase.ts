import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { validationError, forbidden } from "./errors";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";
import type { ReactionRepository } from "../repositories/interfaces/reaction.repository";
import type { NotificationRepository } from "../repositories/interfaces/notification.repository";
import { REACTION_TYPES, REACTION_EMOJI } from "../../shared/constants";
import type { ReactionType } from "../../shared/constants";

export interface ToggleReactionDeps {
  participantRepository: ParticipantRepository;
  reactionRepository: ReactionRepository;
  notificationRepository: NotificationRepository;
}

export interface ToggleReactionInput {
  reactorUserId: number;
  reactorName: string;
  targetUserId: number;
  challengeId: number;
  date: string;
  reactionType: string;
}

export interface ToggleReactionResult {
  added: boolean;
}

export async function toggleReaction(
  deps: ToggleReactionDeps,
  input: ToggleReactionInput,
): Promise<Result<ToggleReactionResult, UseCaseError>> {
  if (input.reactorUserId === input.targetUserId) {
    return err(validationError("Cannot react to your own steps"));
  }

  if (!REACTION_TYPES.includes(input.reactionType as ReactionType)) {
    return err(validationError(`Invalid reaction type: ${input.reactionType}`));
  }

  const reactorIsParticipant = await deps.participantRepository.isParticipant(
    input.challengeId,
    input.reactorUserId,
  );
  if (!reactorIsParticipant) {
    return err(forbidden("Not a participant in this challenge"));
  }

  const targetIsParticipant = await deps.participantRepository.isParticipant(
    input.challengeId,
    input.targetUserId,
  );
  if (!targetIsParticipant) {
    return err(forbidden("Target user is not a participant in this challenge"));
  }

  // Try to remove first (toggle off)
  const removed = await deps.reactionRepository.remove(
    input.reactorUserId,
    input.targetUserId,
    input.challengeId,
    input.date,
    input.reactionType,
  );

  if (removed) {
    return ok({ added: false });
  }

  // Add the reaction (toggle on)
  await deps.reactionRepository.add(
    input.reactorUserId,
    input.targetUserId,
    input.challengeId,
    input.date,
    input.reactionType,
  );

  // Create notification for the target user
  const emoji = REACTION_EMOJI[input.reactionType as ReactionType];
  await deps.notificationRepository.create(
    input.targetUserId,
    "reaction_received",
    `${emoji} Reaction`,
    `${input.reactorName} reacted ${emoji} to your steps`,
    null,
    input.challengeId,
  );

  return ok({ added: true });
}
