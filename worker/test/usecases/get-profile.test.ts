import { describe, test, expect, beforeEach } from "bun:test";
import { getProfile } from "../../usecases/get-profile.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createUserBadge,
  createStepEntry,
  createParticipant,
  resetAllFixtureCounters,
} from "../fixtures";

function createClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("getProfile", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns profile stats and badges", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const badge = createUserBadge({
      user_id: 1,
      badge_type: "challenge_winner",
    });
    const step = createStepEntry({
      user_id: 1,
      date: "2026-01-02",
      step_count: 5000,
    });
    const participant = createParticipant({
      user_id: 1,
      challenge_id: 1,
    });
    seedTestStore(store, {
      users: [user],
      userBadges: [badge],
      stepEntries: [step],
      participants: [participant],
    });

    const { statsRepository, badgeRepository, stepEntryRepository } =
      createMemoryRepos(store);

    const result = await getProfile(
      {
        statsRepository,
        badgeRepository,
        stepEntryRepository,
        clock: createClock("2026-01-02T10:00:00Z"),
      },
      { user },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.stats.total_steps).toBe(5000);
      expect(result.value.stats.challenges_won).toBe(1);
      expect(result.value.badges).toHaveLength(1);
      expect(result.value.stats.today_steps).toBe(5000);
    }
  });
});
