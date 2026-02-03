import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import type { UserBadge } from "../types";

export interface GetBadgesDeps {
  badgeRepository: BadgeRepository;
}

export interface GetBadgesInput {
  userId: number;
}

export async function getBadges(
  deps: GetBadgesDeps,
  input: GetBadgesInput,
): Promise<Result<UserBadge[], UseCaseError>> {
  const badges = await deps.badgeRepository.listForUser(input.userId);
  return ok(badges);
}
