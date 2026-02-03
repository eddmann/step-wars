import { describe, test, expect, beforeEach } from "bun:test";
import { getChallenge } from "../../usecases/get-challenge.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createChallenge,
  createParticipant,
  createUser,
  resetAllFixtureCounters,
} from "../fixtures";

describe("getChallenge", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns challenge with participants", async () => {
    const store = createTestStore();
    const user = createUser({ id: 1, name: "Alice" });
    const challenge = createChallenge({ id: 1 });
    const participant = createParticipant({
      challenge_id: 1,
      user_id: 1,
    });
    seedTestStore(store, {
      users: [user],
      challenges: [challenge],
      participants: [participant],
    });

    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await getChallenge(
      { challengeRepository, participantRepository },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.participants).toHaveLength(1);
    }
  });

  test("returns not found when challenge missing", async () => {
    const store = createTestStore();
    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await getChallenge(
      { challengeRepository, participantRepository },
      { userId: 1, challengeId: 999 },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  test("returns forbidden when user not a participant", async () => {
    const store = createTestStore();
    const challenge = createChallenge({ id: 1 });
    seedTestStore(store, { challenges: [challenge] });

    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await getChallenge(
      { challengeRepository, participantRepository },
      { userId: 1, challengeId: 1 },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });
});
