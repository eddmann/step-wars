import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1LeaderboardRepository } from "../../repositories/d1/leaderboard.d1";
import { createD1ChallengeRepository } from "../../repositories/d1/challenge.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";
import { createD1ParticipantRepository } from "../../repositories/d1/participant.d1";
import { createD1DailyPointsRepository } from "../../repositories/d1/daily-points.d1";
import { createD1StepEntryRepository } from "../../repositories/d1/step-entry.d1";

async function setupChallenge(
  env: Awaited<ReturnType<typeof createTestD1Env>>,
) {
  const userRepo = createD1UserRepository(env);
  const user1 = await userRepo.create("lb1@test.com", "Alice", "hash", "UTC");
  const user2 = await userRepo.create("lb2@test.com", "Bob", "hash", "UTC");

  const challengeRepo = createD1ChallengeRepository(env);
  const challenge = await challengeRepo.create({
    title: "Test",
    description: null,
    creatorId: user1.id,
    startDate: "2026-01-01",
    endDate: "2026-01-03",
    mode: "daily_winner",
    inviteCode: "LB1",
    timezone: "UTC",
    isRecurring: false,
    recurringInterval: null,
  });

  const participantRepo = createD1ParticipantRepository(env);
  await participantRepo.join(challenge.id, user1.id);
  await participantRepo.join(challenge.id, user2.id);

  return { user1, user2, challenge };
}

describe("D1 LeaderboardRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("returns leaderboard rows", async () => {
    const { user1, user2, challenge } = await setupChallenge(env);

    const stepRepo = createD1StepEntryRepository(env);
    await stepRepo.upsert(user1.id, "2026-01-01", 1000, "manual");
    await stepRepo.upsert(user2.id, "2026-01-01", 2000, "manual");

    const pointsRepo = createD1DailyPointsRepository(env);
    await pointsRepo.upsert(challenge.id, user2.id, "2026-01-01", 3);

    const repo = createD1LeaderboardRepository(env);
    const rows = await repo.getChallengeLeaderboard(
      challenge.id,
      "2026-01-01",
      "2026-01-02",
      "2026-01-02",
      "2026-01-02",
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.user_id === user2.id)?.total_points).toBe(3);
  });

  test("returns last finalized steps including zero", async () => {
    const { user1, user2, challenge } = await setupChallenge(env);

    const stepRepo = createD1StepEntryRepository(env);
    await stepRepo.upsert(user1.id, "2026-01-02", 1500, "manual");

    const repo = createD1LeaderboardRepository(env);
    const rows = await repo.getLastFinalizedSteps(challenge.id, "2026-01-02");

    const user1Row = rows.find((row) => row.user_id === user1.id);
    const user2Row = rows.find((row) => row.user_id === user2.id);

    expect(user1Row?.steps).toBe(1500);
    expect(user2Row?.steps).toBe(0);
  });

  test("returns daily steps sorted by steps desc", async () => {
    const { user1, user2, challenge } = await setupChallenge(env);

    const stepRepo = createD1StepEntryRepository(env);
    await stepRepo.upsert(user1.id, "2026-01-02", 1000, "manual");
    await stepRepo.upsert(user2.id, "2026-01-02", 2000, "manual");

    const repo = createD1LeaderboardRepository(env);
    const rows = await repo.getDailyStepsForChallenge(
      challenge.id,
      "2026-01-02",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].user_id).toBe(user2.id);
    expect(rows[1].user_id).toBe(user1.id);
  });

  test("returns cumulative winner", async () => {
    const { user1, user2, challenge } = await setupChallenge(env);

    const stepRepo = createD1StepEntryRepository(env);
    await stepRepo.upsert(user1.id, "2026-01-01", 1000, "manual");
    await stepRepo.upsert(user1.id, "2026-01-02", 1000, "manual");
    await stepRepo.upsert(user2.id, "2026-01-01", 1500, "manual");

    const repo = createD1LeaderboardRepository(env);
    const winner = await repo.getCumulativeWinner(
      challenge.id,
      "2026-01-01",
      "2026-01-02",
    );

    expect(winner?.user_id).toBe(user1.id);
    expect(winner?.score).toBe(2000);
  });

  test("returns points winner", async () => {
    const { user1, user2, challenge } = await setupChallenge(env);

    const pointsRepo = createD1DailyPointsRepository(env);
    await pointsRepo.upsert(challenge.id, user1.id, "2026-01-01", 1);
    await pointsRepo.upsert(challenge.id, user2.id, "2026-01-01", 3);

    const repo = createD1LeaderboardRepository(env);
    const winner = await repo.getPointsWinner(challenge.id);

    expect(winner?.user_id).toBe(user2.id);
    expect(winner?.score).toBe(3);
  });
});
