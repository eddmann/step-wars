import type { User } from "../../types";

let userIdCounter = 1;

const DEFAULT_NOW = "2026-01-01T00:00:00Z";

function nextIdWithOverride(overrideId?: number): number {
  if (overrideId !== undefined) {
    if (overrideId >= userIdCounter) {
      userIdCounter = overrideId + 1;
    }
    return overrideId;
  }
  return userIdCounter++;
}

export function createUser(overrides: Partial<User> = {}): User {
  const id = nextIdWithOverride(overrides.id);
  return {
    id,
    email: overrides.email ?? `user${id}@example.com`,
    name: overrides.name ?? `User ${id}`,
    password_hash: overrides.password_hash ?? "hash",
    timezone: overrides.timezone ?? "UTC",
    created_at: overrides.created_at ?? DEFAULT_NOW,
    updated_at: overrides.updated_at ?? DEFAULT_NOW,
    ...overrides,
  };
}

export function resetUserIdCounter(): void {
  userIdCounter = 1;
}
