import type { User } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { unauthorized } from "./errors";
import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { SessionRepository } from "../repositories/interfaces/session.repository";
import { verifyPassword, generateToken } from "../middleware/auth";

export interface LoginDeps {
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export async function login(
  deps: LoginDeps,
  input: LoginInput,
): Promise<Result<LoginResult, UseCaseError>> {
  const user = await deps.userRepository.getByEmail(input.email.toLowerCase());
  if (!user) {
    return err(unauthorized("Invalid email or password"));
  }

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    return err(unauthorized("Invalid email or password"));
  }

  const token = generateToken();
  await deps.sessionRepository.create(user.id, token);

  return ok({ user, token });
}
