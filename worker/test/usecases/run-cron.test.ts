import { describe, test, expect, beforeEach } from "bun:test";
import { runCron } from "../../usecases/run-cron.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createChallenge,
  createParticipant,
  createStepEntry,
  resetAllFixtureCounters,
} from "../fixtures";

function createClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("runCron", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("activates, calculates points, and finalizes challenges", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-01",
      mode: "daily_winner",
      status: "pending",
      timezone: "UTC",
    });

    const participants = [
      createParticipant({ challenge_id: 1, user_id: 1 }),
      createParticipant({ challenge_id: 1, user_id: 2 }),
    ];

    const steps = [
      createStepEntry({
        user_id: 1,
        date: "2026-01-01",
        step_count: 10000,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-01",
        step_count: 8000,
      }),
    ];

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants,
      stepEntries: steps,
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-02T13:00:00Z"),
    };

    const result = await runCron(deps);

    expect(result.ok).toBe(true);
    const updatedChallenge = store.challenges.find((c) => c.id === 1);
    expect(updatedChallenge?.status).toBe("completed");
    expect(store.dailyPoints).toHaveLength(2);
    expect(
      store.userBadges.find((b) => b.badge_type === "daily_winner"),
    ).toBeTruthy();
    expect(
      store.userBadges.find((b) => b.badge_type === "challenge_winner"),
    ).toBeTruthy();
  });

  test("skips daily points before the edit deadline", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-05",
      mode: "daily_winner",
      status: "active",
      timezone: "UTC",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({
          user_id: 1,
          date: "2026-01-01",
          step_count: 12000,
        }),
        createStepEntry({
          user_id: 2,
          date: "2026-01-01",
          step_count: 8000,
        }),
      ],
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-02T10:00:00Z"),
    };

    await runCron(deps);

    expect(store.dailyPoints).toHaveLength(0);
    expect(store.userBadges).toHaveLength(0);
    expect(store.notifications).toHaveLength(0);
    expect(store.challenges[0].status).toBe("active");
  });

  test("skips daily points outside the challenge date range", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-03",
      end_date: "2026-01-04",
      mode: "daily_winner",
      status: "active",
      timezone: "UTC",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({
          user_id: 1,
          date: "2026-01-01",
          step_count: 12000,
        }),
        createStepEntry({
          user_id: 2,
          date: "2026-01-01",
          step_count: 8000,
        }),
      ],
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-02T13:00:00Z"),
    };

    await runCron(deps);

    expect(store.dailyPoints).toHaveLength(0);
    expect(store.userBadges).toHaveLength(0);
  });

  test("awards daily winner badge and notification", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-03",
      mode: "daily_winner",
      status: "active",
      timezone: "UTC",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({
          user_id: 1,
          date: "2026-01-01",
          step_count: 12000,
        }),
        createStepEntry({
          user_id: 2,
          date: "2026-01-01",
          step_count: 8000,
        }),
      ],
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-02T13:00:00Z"),
    };

    await runCron(deps);

    expect(store.dailyPoints).toHaveLength(2);
    expect(
      store.userBadges.some(
        (badge) => badge.user_id === 1 && badge.badge_type === "daily_winner",
      ),
    ).toBe(true);
    expect(store.notifications).toHaveLength(1);
    expect(store.notifications[0].type).toBe("daily_win");
    expect(store.notifications[0].badge_type).toBe("daily_winner");
    expect(store.notifications[0].challenge_id).toBe(1);
  });

  test("finalizes cumulative challenges and notifies winner", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-01",
      mode: "cumulative",
      status: "active",
      timezone: "UTC",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({
          user_id: 1,
          date: "2026-01-01",
          step_count: 12000,
        }),
        createStepEntry({
          user_id: 2,
          date: "2026-01-01",
          step_count: 8000,
        }),
      ],
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-02T13:00:00Z"),
    };

    await runCron(deps);

    expect(store.challenges[0].status).toBe("completed");
    expect(
      store.userBadges.some(
        (badge) =>
          badge.user_id === 1 && badge.badge_type === "challenge_winner",
      ),
    ).toBe(true);
    expect(store.notifications).toHaveLength(1);
    expect(store.notifications[0].type).toBe("challenge_won");
    expect(store.notifications[0].badge_type).toBe("challenge_winner");
  });

  test("creates the next recurring challenge with participants", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-07",
      mode: "cumulative",
      status: "active",
      timezone: "UTC",
      is_recurring: 1,
      recurring_interval: "weekly",
      invite_code: "ORIGINAL",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({
          user_id: 1,
          date: "2026-01-07",
          step_count: 12000,
        }),
      ],
    });

    const deps = {
      ...createMemoryRepos(store),
      clock: createClock("2026-01-08T13:00:00Z"),
    };

    await runCron(deps);

    expect(store.challenges).toHaveLength(2);
    const nextChallenge = store.challenges.find((c) => c.id === 2);
    expect(nextChallenge).toBeTruthy();
    expect(nextChallenge?.status).toBe("pending");
    expect(nextChallenge?.start_date).toBe("2026-01-08");
    expect(nextChallenge?.end_date).toBe("2026-01-14");
    expect(nextChallenge?.invite_code).not.toBe("ORIGINAL");
    const nextParticipants = store.participants.filter(
      (p) => p.challenge_id === 2,
    );
    expect(nextParticipants).toHaveLength(2);
  });
});
