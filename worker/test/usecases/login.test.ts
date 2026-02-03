import { describe, test, expect, beforeEach } from "bun:test";
import { login } from "../../usecases/login.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createUser, resetAllFixtureCounters } from "../fixtures";
import { hashPassword } from "../../middleware/auth";

describe("login", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("logs in a valid user", async () => {
    const store = createTestStore();
    const passwordHash = await hashPassword("password123");
    seedTestStore(store, {
      users: [
        createUser({
          email: "user@example.com",
          password_hash: passwordHash,
        }),
      ],
    });

    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await login(
      { userRepository, sessionRepository },
      { email: "user@example.com", password: "password123" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.user.email).toBe("user@example.com");
      expect(result.value.token).toBeTruthy();
    }
    expect(store.sessions).toHaveLength(1);
  });

  test("rejects invalid credentials", async () => {
    const store = createTestStore();
    const passwordHash = await hashPassword("password123");
    seedTestStore(store, {
      users: [
        createUser({
          email: "user@example.com",
          password_hash: passwordHash,
        }),
      ],
    });

    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await login(
      { userRepository, sessionRepository },
      { email: "user@example.com", password: "wrong" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
      expect(result.error.message).toBe("Invalid email or password");
    }
  });
});
