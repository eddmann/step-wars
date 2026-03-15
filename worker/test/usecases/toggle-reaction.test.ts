import { describe, test, expect, beforeEach } from "bun:test";
import { toggleReaction } from "../../usecases/toggle-reaction.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import {
  createUser,
  createChallenge,
  createParticipant,
  resetAllFixtureCounters,
} from "../fixtures";

describe("toggleReaction", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  function setup() {
    const store = createTestStore();
    const user1 = createUser({ id: 1, name: "Alice" });
    const user2 = createUser({ id: 2, name: "Bob" });
    const challenge = createChallenge({ id: 1, status: "active" });
    const p1 = createParticipant({ challenge_id: 1, user_id: 1 });
    const p2 = createParticipant({ challenge_id: 1, user_id: 2 });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [p1, p2],
    });

    const repos = createMemoryRepos(store);
    return { store, repos, user1, user2, challenge };
  }

  test("adds a reaction", async () => {
    const { store, repos } = setup();

    const result = await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.added).toBe(true);
    }
    expect(store.reactions).toHaveLength(1);
  });

  test("removes existing reaction (toggle off)", async () => {
    const { store, repos } = setup();

    // First add
    await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    // Then toggle off
    const result = await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.added).toBe(false);
    }
    expect(store.reactions).toHaveLength(0);
  });

  test("rejects self-reaction", async () => {
    const { repos } = setup();

    const result = await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 1,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  test("rejects non-participant reactor", async () => {
    const store = createTestStore();
    const user1 = createUser({ id: 1 });
    const user2 = createUser({ id: 2 });
    const challenge = createChallenge({ id: 1 });
    const p2 = createParticipant({ challenge_id: 1, user_id: 2 });

    seedTestStore(store, {
      users: [user1, user2],
      challenges: [challenge],
      participants: [p2],
    });

    const repos = createMemoryRepos(store);

    const result = await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  test("rejects invalid reaction type", async () => {
    const { repos } = setup();

    const result = await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "invalid_emoji",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });

  test("creates notification on add", async () => {
    const { store, repos } = setup();

    await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(store.notifications).toHaveLength(1);
    expect(store.notifications[0].user_id).toBe(2);
    expect(store.notifications[0].type).toBe("reaction_received");
  });

  test("does not create notification on remove", async () => {
    const { store, repos } = setup();

    // Add first
    await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    // Clear notifications to check no new one is created
    store.notifications.length = 0;

    // Remove
    await toggleReaction(
      {
        participantRepository: repos.participantRepository,
        reactionRepository: repos.reactionRepository,
        notificationRepository: repos.notificationRepository,
      },
      {
        reactorUserId: 1,
        reactorName: "Alice",
        targetUserId: 2,
        challengeId: 1,
        date: "2026-01-01",
        reactionType: "fire",
      },
    );

    expect(store.notifications).toHaveLength(0);
  });
});
