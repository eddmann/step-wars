import type { User } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { unauthorized } from "./errors";
import type { SessionRepository } from "../repositories/interfaces/session.repository";
import type { UserRepository } from "../repositories/interfaces/user.repository";

export interface GetMeDeps {
  sessionRepository: SessionRepository;
  userRepository: UserRepository;
}

export interface GetMeInput {
  token: string | null;
}

export async function getMe(
  deps: GetMeDeps,
  input: GetMeInput,
): Promise<Result<User, UseCaseError>> {
  if (!input.token) {
    return err(unauthorized("Unauthorized"));
  }

  const session = await deps.sessionRepository.getByToken(input.token);
  if (!session) {
    return err(unauthorized("Unauthorized"));
  }

  const user = await deps.userRepository.getById(session.user_id);
  if (!user) {
    return err(unauthorized("Unauthorized"));
  }

  return ok(user);
}
