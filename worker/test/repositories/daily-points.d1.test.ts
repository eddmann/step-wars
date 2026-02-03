import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1DailyPointsRepository } from "../../repositories/d1/daily-points.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";
import { createD1ChallengeRepository } from "../../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../../repositories/d1/participant.d1";

function setupChallenge(env: Awaited<ReturnType<typeof createTestD1Env>>) {
  return (async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("dp@test.com", "User", "hash", "UTC");

    const challengeRepo = createD1ChallengeRepository(env);
    const challenge = await challengeRepo.create({
      title: "Test",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "DP1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const participantRepo = createD1ParticipantRepository(env);
    await participantRepo.join(challenge.id, user.id);

    return { user, challenge };
  })();
}

describe("D1 DailyPointsRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("upserts and checks points", async () => {
    const { user, challenge } = await setupChallenge(env);
    const repo = createD1DailyPointsRepository(env);

    await repo.upsert(challenge.id, user.id, "2026-01-01", 3);
    const exists = await repo.hasPointsForDate(challenge.id, "2026-01-01");
    expect(exists).toBe(true);
  });

  test("lists points for date", async () => {
    const { user, challenge } = await setupChallenge(env);
    const repo = createD1DailyPointsRepository(env);

    await repo.upsert(challenge.id, user.id, "2026-01-01", 2);
    const rows = await repo.listForDate(challenge.id, "2026-01-01");
    expect(rows).toHaveLength(1);
    expect(rows[0].points).toBe(2);
  });

  test("returns total points winner for challenge", async () => {
    const { user: user1, challenge } = await setupChallenge(env);

    const userRepo = createD1UserRepository(env);
    const user2 = await userRepo.create("dp2@test.com", "User2", "hash", "UTC");

    const participantRepo = createD1ParticipantRepository(env);
    await participantRepo.join(challenge.id, user2.id);

    const repo = createD1DailyPointsRepository(env);
    await repo.upsert(challenge.id, user1.id, "2026-01-01", 1);
    await repo.upsert(challenge.id, user1.id, "2026-01-02", 1);
    await repo.upsert(challenge.id, user2.id, "2026-01-01", 3);

    const winner = await repo.getTotalPointsForChallenge(challenge.id);
    expect(winner?.user_id).toBe(user2.id);
    expect(winner?.score).toBe(3);
  });
});
