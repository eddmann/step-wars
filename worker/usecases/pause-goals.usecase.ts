import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { UserGoals } from "../types";

type PublicGoals = Omit<UserGoals, "is_paused"> & { is_paused: boolean };

export interface PauseGoalsDeps {
  goalsRepository: GoalsRepository;
}

export interface PauseGoalsInput {
  userId: number;
}

export async function pauseGoals(
  deps: PauseGoalsDeps,
  input: PauseGoalsInput,
): Promise<Result<{ goals: PublicGoals }, UseCaseError>> {
  const updatedGoals = await deps.goalsRepository.togglePause(
    input.userId,
    true,
  );
  return ok({
    goals: {
      ...updatedGoals,
      is_paused: true,
    },
  });
}
