import { describe, test, expect, beforeEach } from "bun:test";
import { joinChallenge } from "../../usecases/join-challenge.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createChallenge,
  createParticipant,
  resetAllFixtureCounters,
} from "../fixtures";

describe("joinChallenge", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("joins a challenge by invite code", async () => {
    const store = createTestStore();
    const challenge = createChallenge({ invite_code: "ABC123" });
    seedTestStore(store, { challenges: [challenge] });

    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await joinChallenge(
      { challengeRepository, participantRepository },
      { userId: 2, inviteCode: "ABC123" },
    );

    expect(result.ok).toBe(true);
    expect(store.participants).toHaveLength(1);
  });

  test("returns not found for invalid invite code", async () => {
    const store = createTestStore();
    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await joinChallenge(
      { challengeRepository, participantRepository },
      { userId: 2, inviteCode: "MISSING" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });

  test("returns conflict when already joined", async () => {
    const store = createTestStore();
    const challenge = createChallenge({ invite_code: "JOINME" });
    const participant = createParticipant({
      challenge_id: challenge.id,
      user_id: 2,
    });
    seedTestStore(store, {
      challenges: [challenge],
      participants: [participant],
    });

    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await joinChallenge(
      { challengeRepository, participantRepository },
      { userId: 2, inviteCode: "JOINME" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONFLICT");
    }
  });
});
