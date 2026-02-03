import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { UserGoals } from "../types";

type PublicGoals = Omit<UserGoals, "is_paused"> & { is_paused: boolean };

export interface UpdateGoalsDeps {
  goalsRepository: GoalsRepository;
}

export interface UpdateGoalsInput {
  userId: number;
  dailyTarget?: number;
  weeklyTarget?: number;
}

export async function updateGoals(
  deps: UpdateGoalsDeps,
  input: UpdateGoalsInput,
): Promise<Result<{ goals: PublicGoals }, UseCaseError>> {
  const currentGoals = await deps.goalsRepository.getOrCreate(input.userId);

  const dailyTarget = input.dailyTarget ?? currentGoals.daily_target;
  const weeklyTarget = input.weeklyTarget ?? currentGoals.weekly_target;

  const updatedGoals = await deps.goalsRepository.update(
    input.userId,
    dailyTarget,
    weeklyTarget,
  );

  return ok({
    goals: {
      ...updatedGoals,
      is_paused: Boolean(updatedGoals.is_paused),
    },
  });
}
