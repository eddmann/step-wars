import { describe, test, expect, beforeEach } from "bun:test";
import { getLeaderboard } from "../../usecases/get-leaderboard.usecase";
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

describe("getLeaderboard", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns leaderboard with correct visibility rules", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      mode: "daily_winner",
      status: "active",
      start_date: "2026-01-01",
      end_date: "2026-01-03",
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
        step_count: 1000,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-02",
        step_count: 2000,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-03",
        step_count: 3000,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-01",
        step_count: 1500,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-02",
        step_count: 2500,
      }),
      createStepEntry({
        user_id: 2,
        date: "2026-01-03",
        step_count: 1000,
      }),
    ];

    const points = [
      createDailyPoints({
        challenge_id: 1,
        user_id: 1,
        date: "2026-01-01",
        points: 2,
      }),
      createDailyPoints({
        challenge_id: 1,
        user_id: 2,
        date: "2026-01-01",
        points: 3,
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
    } = createMemoryRepos(store);

    const result = await getLeaderboard(
      {
        challengeRepository,
        participantRepository,
        leaderboardRepository,
        clock: createClock("2026-01-03T10:00:00Z"),
      },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const current = result.value.leaderboard.find(
        (entry) => entry.user_id === 1,
      );
      expect(result.value.edit_cutoff_date).toBe("2026-01-02");
      expect(result.value.last_finalized_date).toBe("2026-01-01");
      expect(current?.total_steps).toBe(6000); // current user sees confirmed + pending
      const other = result.value.leaderboard.find(
        (entry) => entry.user_id === 2,
      );
      expect(other?.total_steps).toBe(1500); // other user sees confirmed only
      expect(result.value.leaderboard[0].total_points).toBeGreaterThanOrEqual(
        result.value.leaderboard[1].total_points,
      );
    }
  });
});
