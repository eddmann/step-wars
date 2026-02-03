import { describe, test, expect, beforeEach } from "bun:test";
import { getMe } from "../../usecases/get-me.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createSession,
  resetAllFixtureCounters,
} from "../fixtures";

describe("getMe", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns user for valid session", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1 });
    const session = createSession({ user_id: 1, token: "token-1" });
    seedTestStore(store, { users: [user], sessions: [session] });

    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await getMe(
      { userRepository, sessionRepository },
      { token: "token-1" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(1);
    }
  });

  test("returns unauthorized for missing token", async () => {
    const store = createTestStore();
    const { userRepository, sessionRepository } = createMemoryRepos(store);

    const result = await getMe(
      { userRepository, sessionRepository },
      { token: null },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });
});
