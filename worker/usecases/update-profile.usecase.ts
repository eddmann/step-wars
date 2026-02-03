import type { User } from "../types";
import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { notFound } from "./errors";
import type { UserRepository } from "../repositories/interfaces/user.repository";

export interface UpdateProfileDeps {
  userRepository: UserRepository;
}

export interface UpdateProfileInput {
  userId: number;
  name: string;
  email: string;
  timezone?: string;
}

export async function updateProfile(
  deps: UpdateProfileDeps,
  input: UpdateProfileInput,
): Promise<Result<User, UseCaseError>> {
  const updatedUser = await deps.userRepository.update(
    input.userId,
    input.name,
    input.email,
    input.timezone,
  );

  if (!updatedUser) {
    return err(notFound("User", input.userId));
  }

  return ok(updatedUser);
}
