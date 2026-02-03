import { describe, test, expect, beforeEach } from "bun:test";
import { listUserChallenges } from "../../usecases/list-user-challenges.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createChallenge,
  createParticipant,
  resetAllFixtureCounters,
} from "../fixtures";

describe("listUserChallenges", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("lists challenges for a user with participant counts", async () => {
    const store = createTestStore();
    const challenge1 = createChallenge({
      id: 1,
      start_date: "2026-01-03",
    });
    const challenge2 = createChallenge({
      id: 2,
      start_date: "2026-01-01",
    });
    const participants = [
      createParticipant({ challenge_id: 1, user_id: 1 }),
      createParticipant({ challenge_id: 1, user_id: 2 }),
      createParticipant({ challenge_id: 2, user_id: 1 }),
    ];

    seedTestStore(store, {
      challenges: [challenge1, challenge2],
      participants,
    });

    const { challengeRepository } = createMemoryRepos(store);
    const result = await listUserChallenges(
      { challengeRepository },
      { userId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].participant_count).toBe(2);
    }
  });
});
