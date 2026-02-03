import { describe, test, expect, beforeEach } from "bun:test";
import { logout } from "../../usecases/logout.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createSession, resetAllFixtureCounters } from "../fixtures";

describe("logout", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("removes session when token provided", async () => {
    const store = createTestStore();
    seedTestStore(store, {
      sessions: [createSession({ token: "token-1" })],
    });

    const { sessionRepository } = createMemoryRepos(store);

    const result = await logout({ sessionRepository }, { token: "token-1" });

    expect(result.ok).toBe(true);
    expect(store.sessions).toHaveLength(0);
  });

  test("succeeds even without token", async () => {
    const store = createTestStore();
    const { sessionRepository } = createMemoryRepos(store);

    const result = await logout({ sessionRepository }, { token: null });

    expect(result.ok).toBe(true);
  });
});
