import type { StepEntry } from "../types";
import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";

export interface ListStepsDeps {
  stepEntryRepository: StepEntryRepository;
}

export interface ListStepsInput {
  userId: number;
}

export async function listSteps(
  deps: ListStepsDeps,
  input: ListStepsInput,
): Promise<Result<StepEntry[], UseCaseError>> {
  const entries = await deps.stepEntryRepository.listForUser(input.userId);
  return ok(entries);
}
