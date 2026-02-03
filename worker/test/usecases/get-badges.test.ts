import { describe, test, expect, beforeEach } from "bun:test";
import { getBadges } from "../../usecases/get-badges.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createUserBadge, resetAllFixtureCounters } from "../fixtures";

describe("getBadges", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns user badges", async () => {
    const store = createTestStore();
    const badge = createUserBadge({
      user_id: 1,
      badge_type: "daily_winner",
    });
    seedTestStore(store, { userBadges: [badge] });

    const { badgeRepository } = createMemoryRepos(store);
    const result = await getBadges({ badgeRepository }, { userId: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });
});
