import type { User, UserBadge } from "../types";
import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { StatsRepository } from "../repositories/interfaces/stats.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import { getDateInTimezone } from "../../shared/dateUtils";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface GetProfileDeps {
  statsRepository: StatsRepository;
  badgeRepository: BadgeRepository;
  stepEntryRepository: StepEntryRepository;
  clock?: Clock;
}

export interface GetProfileInput {
  user: User;
}

export interface GetProfileResult {
  user: {
    id: number;
    email: string;
    name: string;
    timezone: string;
    created_at: string;
  };
  stats: {
    total_steps: number;
    challenges_joined: number;
    challenges_won: number;
    badges_earned: number;
    today_steps: number;
  };
  badges: UserBadge[];
}

export async function getProfile(
  deps: GetProfileDeps,
  input: GetProfileInput,
): Promise<Result<GetProfileResult, UseCaseError>> {
  const badges = await deps.badgeRepository.listForUser(input.user.id);
  const stats = await deps.statsRepository.getUserStats(input.user.id);

  const now = (deps.clock ?? systemClock).now();
  const today = getDateInTimezone(input.user.timezone, now);
  const todaySteps = await deps.stepEntryRepository.getStepsForDate(
    input.user.id,
    today,
  );

  return ok({
    user: {
      id: input.user.id,
      email: input.user.email,
      name: input.user.name,
      timezone: input.user.timezone,
      created_at: input.user.created_at,
    },
    stats: {
      ...stats,
      today_steps: todaySteps,
    },
    badges,
  });
}
