import { describe, test, expect, beforeEach } from "bun:test";
import { registerUser } from "../../usecases/register-user.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createUser, resetAllFixtureCounters } from "../fixtures";

describe("registerUser", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("registers a new user and creates a session", async () => {
    const store = createTestStore();
    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await registerUser(
      { userRepository, sessionRepository },
      {
        email: "new@example.com",
        name: "New User",
        password: "password123",
        timezone: "UTC",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("new@example.com");
      expect(result.value.token).toBeTruthy();
    }
    expect(store.users).toHaveLength(1);
    expect(store.sessions).toHaveLength(1);
  });

  test("returns validation error when email already exists", async () => {
    const store = createTestStore();
    seedTestStore(store, {
      users: [createUser({ email: "dup@example.com" })],
    });

    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await registerUser(
      { userRepository, sessionRepository },
      {
        email: "dup@example.com",
        name: "Dup",
        password: "password123",
        timezone: "UTC",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toBe("Email already registered");
    }
  });
});
