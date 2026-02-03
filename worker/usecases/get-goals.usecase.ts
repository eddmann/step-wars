import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import type { NotificationRepository } from "../repositories/interfaces/notification.repository";
import { getDateInTimezone } from "../../shared/dateUtils";
import { getStartOfWeek } from "../utils/week-range";
import type { PendingNotification } from "../types";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface GetGoalsDeps {
  goalsRepository: GoalsRepository;
  stepEntryRepository: StepEntryRepository;
  notificationRepository: NotificationRepository;
  clock?: Clock;
}

export interface GetGoalsInput {
  userId: number;
  timezone: string;
}

export async function getGoals(
  deps: GetGoalsDeps,
  input: GetGoalsInput,
): Promise<
  Result<
    {
      goals: {
        id: number;
        user_id: number;
        daily_target: number;
        weekly_target: number;
        is_paused: boolean;
        paused_at: string | null;
        current_streak: number;
        longest_streak: number;
        last_achieved_date: string | null;
        created_at: string;
        updated_at: string;
      };
      today_steps: number;
      weekly_steps: number;
      daily_progress: number;
      weekly_progress: number;
      notifications: PendingNotification[];
    },
    UseCaseError
  >
> {
  const userGoals = await deps.goalsRepository.getOrCreate(input.userId);

  const now = (deps.clock ?? systemClock).now();
  const today = getDateInTimezone(input.timezone, now);
  const todaySteps = await deps.stepEntryRepository.getStepsForDate(
    input.userId,
    today,
  );

  const startDate = getStartOfWeek(today);
  const weeklySteps = await deps.stepEntryRepository.sumForUserBetweenDates(
    input.userId,
    startDate,
    today,
  );

  const notifications = await deps.notificationRepository.listPending(
    input.userId,
  );

  return ok({
    goals: {
      ...userGoals,
      is_paused: Boolean(userGoals.is_paused),
    },
    today_steps: todaySteps,
    weekly_steps: weeklySteps,
    daily_progress: Math.min(
      100,
      Math.round((todaySteps / userGoals.daily_target) * 100),
    ),
    weekly_progress: Math.min(
      100,
      Math.round((weeklySteps / userGoals.weekly_target) * 100),
    ),
    notifications,
  });
}
