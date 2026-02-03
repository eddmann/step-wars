import type { User } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { validationError } from "./errors";
import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { SessionRepository } from "../repositories/interfaces/session.repository";
import { hashPassword, generateToken } from "../middleware/auth";

export interface RegisterUserDeps {
  userRepository: UserRepository;
  sessionRepository: SessionRepository;
}

export interface RegisterUserInput {
  email: string;
  name: string;
  password: string;
  timezone: string;
}

export interface RegisterUserResult {
  user: User;
  token: string;
}

export async function registerUser(
  deps: RegisterUserDeps,
  input: RegisterUserInput,
): Promise<Result<RegisterUserResult, UseCaseError>> {
  const existing = await deps.userRepository.getByEmail(
    input.email.toLowerCase(),
  );
  if (existing) {
    return err(validationError("Email already registered"));
  }

  const passwordHash = await hashPassword(input.password);

  const user = await deps.userRepository.create(
    input.email.toLowerCase(),
    input.name,
    passwordHash,
    input.timezone,
  );

  const token = generateToken();
  await deps.sessionRepository.create(user.id, token);

  return ok({ user, token });
}
