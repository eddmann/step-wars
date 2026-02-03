import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1StatsRepository } from "../../repositories/d1/stats.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";
import { createD1StepEntryRepository } from "../../repositories/d1/step-entry.d1";
import { createD1BadgeRepository } from "../../repositories/d1/badge.d1";
import { createD1ChallengeRepository } from "../../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../../repositories/d1/participant.d1";

describe("D1 StatsRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("returns aggregate stats", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("s@test.com", "Stats", "hash", "UTC");

    const stepRepo = createD1StepEntryRepository(env);
    await stepRepo.upsert(user.id, "2026-01-01", 1000, "manual");

    const badgeRepo = createD1BadgeRepository(env);
    await badgeRepo.award(user.id, "challenge_winner");

    const challengeRepo = createD1ChallengeRepository(env);
    const challenge = await challengeRepo.create({
      title: "Test",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "STAT1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const participantRepo = createD1ParticipantRepository(env);
    await participantRepo.join(challenge.id, user.id);

    const repo = createD1StatsRepository(env);
    const stats = await repo.getUserStats(user.id);

    expect(stats.total_steps).toBe(1000);
    expect(stats.challenges_joined).toBe(1);
    expect(stats.challenges_won).toBe(1);
    expect(stats.badges_earned).toBe(1);
  });
});
