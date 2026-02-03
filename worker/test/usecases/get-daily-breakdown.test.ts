import { describe, test, expect, beforeEach } from "bun:test";
import { getDailyBreakdown } from "../../usecases/get-daily-breakdown.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createChallenge,
  createParticipant,
  createStepEntry,
  createDailyPoints,
  resetAllFixtureCounters,
} from "../fixtures";

function createClock(iso: string) {
  return { now: () => new Date(iso) };
}

describe("getDailyBreakdown", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns days with pending visibility rules", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-03",
      timezone: "UTC",
      status: "active",
    });

    const participants = [
      createParticipant({ challenge_id: 1, user_id: 1 }),
      createParticipant({ challenge_id: 1, user_id: 2 }),
    ];

    const steps = [
      createStepEntry({
        user_id: 1,
        date: "2026-01-01",
        step_count: 1000,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-01",
        step_count: 1500,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-02",
        step_count: 2000,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-02",
        step_count: 2500,
      }),
    ];

    const points = [
      createDailyPoints({
        challenge_id: 1,
        user_id: 2,
        date: "2026-01-01",
        points: 3,
      }),
      createDailyPoints({
        challenge_id: 1,
        user_id: 1,
        date: "2026-01-01",
        points: 2,
      }),
    ];

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants,
      stepEntries: steps,
      dailyPoints: points,
    });

    const {
      challengeRepository,
      participantRepository,
      leaderboardRepository,
      dailyPointsRepository,
    } = createMemoryRepos(store);

    const result = await getDailyBreakdown(
      {
        challengeRepository,
        participantRepository,
        leaderboardRepository,
        dailyPointsRepository,
        clock: createClock("2026-01-03T10:00:00Z"),
      },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const pendingDay = result.value.days.find((d) => d.date === "2026-01-02");
      expect(pendingDay?.status).toBe("pending");
      const bobRow = pendingDay?.rankings.find((r) => r.user_id === 2);
      expect(bobRow?.steps).toBeNull();

      const finalizedDay = result.value.days.find(
        (d) => d.date === "2026-01-01",
      );
      expect(finalizedDay?.status).toBe("finalized");
      const aliceRow = finalizedDay?.rankings.find((r) => r.user_id === 1);
      expect(aliceRow?.points).toBe(2);
    }
  });
});
