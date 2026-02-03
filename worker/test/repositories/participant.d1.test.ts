import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1ParticipantRepository } from "../../repositories/d1/participant.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";
import { createD1ChallengeRepository } from "../../repositories/d1/challenge.d1";

describe("D1 ParticipantRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("joins and checks participant", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("p@test.com", "Part", "hash", "UTC");

    const challengeRepo = createD1ChallengeRepository(env);
    const challenge = await challengeRepo.create({
      title: "Test",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "PINV",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const repo = createD1ParticipantRepository(env);
    const joined = await repo.join(challenge.id, user.id);
    expect(joined).toBe(true);

    const isParticipant = await repo.isParticipant(challenge.id, user.id);
    expect(isParticipant).toBe(true);
  });

  test("returns false when already joined", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("p2@test.com", "Part2", "hash", "UTC");

    const challengeRepo = createD1ChallengeRepository(env);
    const challenge = await challengeRepo.create({
      title: "Test",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "PINV2",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const repo = createD1ParticipantRepository(env);
    await repo.join(challenge.id, user.id);
    const joinedAgain = await repo.join(challenge.id, user.id);
    expect(joinedAgain).toBe(false);
  });

  test("lists participants ordered by joined time", async () => {
    const userRepo = createD1UserRepository(env);
    const user1 = await userRepo.create("p3@test.com", "Part3", "hash", "UTC");
    const user2 = await userRepo.create("p4@test.com", "Part4", "hash", "UTC");

    const challengeRepo = createD1ChallengeRepository(env);
    const challenge = await challengeRepo.create({
      title: "Test",
      description: null,
      creatorId: user1.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "PLIST",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const repo = createD1ParticipantRepository(env);
    await repo.join(challenge.id, user1.id);
    await repo.join(challenge.id, user2.id);

    await env.DB.prepare(
      `UPDATE challenge_participants SET joined_at = ? WHERE challenge_id = ? AND user_id = ?`,
    )
      .bind("2026-01-01T00:00:00.000Z", challenge.id, user1.id)
      .run();
    await env.DB.prepare(
      `UPDATE challenge_participants SET joined_at = ? WHERE challenge_id = ? AND user_id = ?`,
    )
      .bind("2026-01-02T00:00:00.000Z", challenge.id, user2.id)
      .run();

    const participants = await repo.listParticipants(challenge.id);
    expect(participants).toHaveLength(2);
    expect(participants[0].user_id).toBe(user1.id);
    expect(participants[1].user_id).toBe(user2.id);
  });
});
