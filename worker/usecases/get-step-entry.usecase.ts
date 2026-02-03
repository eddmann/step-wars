import type { StepEntry } from "../types";
import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";

export interface GetStepEntryDeps {
  stepEntryRepository: StepEntryRepository;
}

export interface GetStepEntryInput {
  userId: number;
  date: string;
}

export async function getStepEntry(
  deps: GetStepEntryDeps,
  input: GetStepEntryInput,
): Promise<Result<StepEntry | null, UseCaseError>> {
  const entry = await deps.stepEntryRepository.getByUserAndDate(
    input.userId,
    input.date,
  );
  return ok(entry);
}
