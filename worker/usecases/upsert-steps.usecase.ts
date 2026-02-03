import type { StepEntry } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { validationError } from "./errors";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";
import {
  getDateTimeInTimezone,
  getYesterdayInTimezone,
} from "../../shared/dateUtils";
import { updateUserStreak } from "../services/streak";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface UpsertStepsDeps {
  stepEntryRepository: StepEntryRepository;
  userRepository: UserRepository;
  goalsRepository: GoalsRepository;
  badgeRepository: BadgeRepository;
  clock?: Clock;
}

export interface UpsertStepsInput {
  userId: number;
  userTimezone: string;
  date: string;
  stepCount: number;
  source?: string;
}

export async function upsertSteps(
  deps: UpsertStepsDeps,
  input: UpsertStepsInput,
): Promise<Result<StepEntry, UseCaseError>> {
  const now = (deps.clock ?? systemClock).now();
  if (!canEditDate(input.date, input.userTimezone, now)) {
    return err(
      validationError(
        "Cannot edit steps for this date. Entries can only be modified until noon the next day.",
      ),
    );
  }

  const entry = await deps.stepEntryRepository.upsert(
    input.userId,
    input.date,
    input.stepCount,
    input.source || "manual",
  );

  await updateUserStreak(
    {
      userRepository: deps.userRepository,
      goalsRepository: deps.goalsRepository,
      stepEntryRepository: deps.stepEntryRepository,
      badgeRepository: deps.badgeRepository,
      clock: deps.clock,
    },
    input.userId,
  );

  return ok(entry);
}

function canEditDate(
  dateStr: string,
  userTimezone: string,
  now: Date,
): boolean {
  const { date: today, hour } = getDateTimeInTimezone(userTimezone, now);
  const yesterday = getYesterdayInTimezone(userTimezone, now);

  if (dateStr === today) return true;
  if (dateStr === yesterday) {
    return hour < EDIT_DEADLINE_HOUR;
  }
  return false;
}
