import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { SessionRepository } from "../repositories/interfaces/session.repository";

export interface LogoutDeps {
  sessionRepository: SessionRepository;
}

export interface LogoutInput {
  token: string | null;
}

export async function logout(
  deps: LogoutDeps,
  input: LogoutInput,
): Promise<Result<{ success: true }, UseCaseError>> {
  if (input.token) {
    await deps.sessionRepository.delete(input.token);
  }
  return ok({ success: true });
}
