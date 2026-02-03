import { describe, test, expect, beforeEach } from "bun:test";
import { getGoals } from "../../usecases/get-goals.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createStepEntry,
  createNotification,
  resetAllFixtureCounters,
} from "../fixtures";

function createClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("getGoals", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns goals, progress, and notifications", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const notifications = [createNotification({ user_id: 1 })];
    const entries = [
      createStepEntry({
        user_id: 1,
        date: "2026-01-08",
        step_count: 5000,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-07",
        step_count: 2000,
      }),
    ];

    seedTestStore(store, {
      users: [user],
      notifications,
      stepEntries: entries,
    });

    const { goalsRepository, stepEntryRepository, notificationRepository } =
      createMemoryRepos(store);

    const result = await getGoals(
      {
        goalsRepository,
        stepEntryRepository,
        notificationRepository,
        clock: createClock("2026-01-08T10:00:00Z"),
      },
      { userId: 1, timezone: "UTC" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.today_steps).toBe(5000);
      expect(result.value.weekly_steps).toBe(7000);
      expect(result.value.daily_progress).toBe(50);
      expect(result.value.notifications).toHaveLength(1);
    }
  });
});
