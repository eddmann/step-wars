import { describe, test, expect, beforeEach } from "bun:test";
import { upsertSteps } from "../../usecases/upsert-steps.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createStepEntry,
  resetAllFixtureCounters,
} from "../fixtures";

function createClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("upsertSteps", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("allows editing yesterday before noon", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    seedTestStore(store, { users: [user] });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-02T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-01",
        stepCount: 10000,
        source: "manual",
      },
    );

    expect(result.ok).toBe(true);
    expect(store.stepEntries).toHaveLength(1);
    expect(store.userGoals[0].current_streak).toBe(1);
    expect(store.userGoals[0].last_achieved_date).toBe("2026-01-01");
  });

  test("rejects editing yesterday after noon", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    seedTestStore(store, { users: [user] });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-02T13:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-01",
        stepCount: 10000,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  test("updates streak and awards milestone badges", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const priorEntries = [
      createStepEntry({ user_id: 1, date: "2026-01-01", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-02", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-03", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-04", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-05", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-06", step_count: 12000 }),
    ];

    seedTestStore(store, { users: [user], stepEntries: priorEntries });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-07T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-07",
        stepCount: 12000,
        source: "manual",
      },
    );

    expect(result.ok).toBe(true);
    expect(store.userGoals[0].current_streak).toBe(7);
    expect(store.userGoals[0].longest_streak).toBe(7);
    expect(store.userGoals[0].last_achieved_date).toBe("2026-01-07");
    expect(
      store.userBadges.some((badge) => badge.badge_type === "streak_7"),
    ).toBe(true);
  });

  test("counts streak from yesterday when today misses target", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const priorEntries = [
      createStepEntry({ user_id: 1, date: "2026-01-06", step_count: 12000 }),
      createStepEntry({ user_id: 1, date: "2026-01-07", step_count: 12000 }),
    ];

    seedTestStore(store, { users: [user], stepEntries: priorEntries });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-08T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-08",
        stepCount: 5000,
      },
    );

    expect(result.ok).toBe(true);
    expect(store.userGoals[0].current_streak).toBe(2);
    expect(store.userGoals[0].longest_streak).toBe(2);
    expect(store.userGoals[0].last_achieved_date).toBe("2026-01-07");
    expect(
      store.userBadges.some((badge) => badge.badge_type === "streak_7"),
    ).toBe(false);
  });

  test("awards ultra_day badge at 40k steps", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    seedTestStore(store, { users: [user] });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-01T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-01",
        stepCount: 40000,
      },
    );

    expect(result.ok).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "ultra_day"),
    ).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "fifty_k_day"),
    ).toBe(false);
  });

  test("awards fifty_k_day badge at 50k steps", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    seedTestStore(store, { users: [user] });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-01T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-01",
        stepCount: 50000,
      },
    );

    expect(result.ok).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "fifty_k_day"),
    ).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "ultra_day"),
    ).toBe(true);
  });

  test("awards days_100 badge after 100 days logged", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const priorEntries = Array.from({ length: 99 }, (_, i) => {
      const date = new Date(2025, 0, 1 + i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return createStepEntry({ user_id: 1, date: dateStr, step_count: 5000 });
    });

    seedTestStore(store, { users: [user], stepEntries: priorEntries });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2025-04-11T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2025-04-11",
        stepCount: 5000,
      },
    );

    expect(result.ok).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "days_100"),
    ).toBe(true);
  });

  test("awards steps_1m badge at 1 million lifetime steps", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    const priorEntries = [
      createStepEntry({
        user_id: 1,
        date: "2026-01-01",
        step_count: 990000,
      }),
    ];

    seedTestStore(store, { users: [user], stepEntries: priorEntries });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-02T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-02",
        stepCount: 10000,
      },
    );

    expect(result.ok).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "steps_1m"),
    ).toBe(true);
    expect(
      store.userBadges.some((badge) => badge.badge_type === "steps_5m"),
    ).toBe(false);
  });

  test("resets streak when no qualifying days", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, timezone: "UTC" });
    seedTestStore(store, { users: [user] });

    const {
      stepEntryRepository,
      userRepository,
      goalsRepository,
      badgeRepository,
    } = createMemoryRepos(store);

    const result = await upsertSteps(
      {
        stepEntryRepository,
        userRepository,
        goalsRepository,
        badgeRepository,
        clock: createClock("2026-01-02T10:00:00Z"),
      },
      {
        userId: 1,
        userTimezone: "UTC",
        date: "2026-01-02",
        stepCount: 2000,
      },
    );

    expect(result.ok).toBe(true);
    expect(store.userGoals[0].current_streak).toBe(0);
    expect(store.userGoals[0].longest_streak).toBe(0);
    expect(store.userGoals[0].last_achieved_date).toBeNull();
  });
});
