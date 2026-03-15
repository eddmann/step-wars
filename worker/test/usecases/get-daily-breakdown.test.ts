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
  createReaction,
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

  test("finalized days include reaction counts and user_reactions", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-02",
      timezone: "UTC",
      status: "active",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({ user_id: 1, date: "2026-01-01", step_count: 1000 }),
        createStepEntry({ user_id: 2, date: "2026-01-01", step_count: 1500 }),
      ],
      dailyPoints: [
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
      ],
      reactions: [
        createReaction({
          reactor_user_id: 1,
          target_user_id: 2,
          challenge_id: 1,
          date: "2026-01-01",
          reaction_type: "fire",
        }),
        createReaction({
          reactor_user_id: 2,
          target_user_id: 2,
          challenge_id: 1,
          date: "2026-01-01",
          reaction_type: "fire",
        }),
        createReaction({
          reactor_user_id: 1,
          target_user_id: 2,
          challenge_id: 1,
          date: "2026-01-01",
          reaction_type: "thumbs_up",
        }),
      ],
    });

    const {
      challengeRepository,
      participantRepository,
      leaderboardRepository,
      dailyPointsRepository,
      reactionRepository,
    } = createMemoryRepos(store);

    const result = await getDailyBreakdown(
      {
        challengeRepository,
        participantRepository,
        leaderboardRepository,
        dailyPointsRepository,
        reactionRepository,
        clock: createClock("2026-01-03T13:00:00Z"),
      },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const day = result.value.days.find((d) => d.date === "2026-01-01");
      expect(day?.status).toBe("finalized");

      const bobRow = day?.rankings.find((r) => r.user_id === 2);
      expect(bobRow?.reactions).toEqual({ fire: 2, thumbs_up: 1 });
      expect(bobRow?.user_reactions).toEqual(
        expect.arrayContaining(["fire", "thumbs_up"]),
      );
      expect(bobRow?.user_reactions).toHaveLength(2);

      const aliceRow = day?.rankings.find((r) => r.user_id === 1);
      expect(aliceRow?.reactions).toEqual({});
      expect(aliceRow?.user_reactions).toEqual([]);
    }
  });

  test("pending days have empty reactions and user_reactions", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({
      id: 1,
      start_date: "2026-01-01",
      end_date: "2026-01-02",
      timezone: "UTC",
      status: "active",
    });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [
        createParticipant({ challenge_id: 1, user_id: 1 }),
        createParticipant({ challenge_id: 1, user_id: 2 }),
      ],
      stepEntries: [
        createStepEntry({ user_id: 1, date: "2026-01-02", step_count: 3000 }),
        createStepEntry({ user_id: 2, date: "2026-01-02", step_count: 4000 }),
      ],
      reactions: [
        createReaction({
          reactor_user_id: 1,
          target_user_id: 2,
          challenge_id: 1,
          date: "2026-01-02",
          reaction_type: "fire",
        }),
      ],
    });

    const {
      challengeRepository,
      participantRepository,
      leaderboardRepository,
      dailyPointsRepository,
      reactionRepository,
    } = createMemoryRepos(store);

    const result = await getDailyBreakdown(
      {
        challengeRepository,
        participantRepository,
        leaderboardRepository,
        dailyPointsRepository,
        reactionRepository,
        clock: createClock("2026-01-02T10:00:00Z"),
      },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const pendingDay = result.value.days.find((d) => d.date === "2026-01-02");
      expect(pendingDay?.status).toBe("pending");

      for (const ranking of pendingDay?.rankings ?? []) {
        expect(ranking.reactions).toEqual({});
        expect(ranking.user_reactions).toEqual([]);
      }
    }
  });
});
