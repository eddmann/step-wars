import { describe, test, expect, beforeEach } from "bun:test";
import { updateProfile } from "../../usecases/update-profile.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createUser, resetAllFixtureCounters } from "../fixtures";

describe("updateProfile", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("updates user profile fields", async () => {
    const store = createTestStore();
    const user = createUser({
      id: 1,
      email: "old@example.com",
      name: "Old",
    });
    seedTestStore(store, { users: [user] });

    const { userRepository } = createMemoryRepos(store);
    const result = await updateProfile(
      { userRepository },
      { userId: 1, name: "New", email: "new@example.com", timezone: "UTC" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe("New");
      expect(result.value.email).toBe("new@example.com");
    }
  });
});
