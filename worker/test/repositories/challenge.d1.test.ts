import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1ChallengeRepository } from "../../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../../repositories/d1/participant.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 ChallengeRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("creates challenge and lists for user", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("c@test.com", "Creator", "hash", "UTC");

    const repo = createD1ChallengeRepository(env);
    const challenge = await repo.create({
      title: "Test",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "INV1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const participantRepo = createD1ParticipantRepository(env);
    await participantRepo.join(challenge.id, user.id);

    const list = await repo.listForUser(user.id);
    expect(list).toHaveLength(1);
    expect(list[0].participant_count).toBe(1);
  });

  test("finds by invite code", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create(
      "c2@test.com",
      "Creator2",
      "hash",
      "UTC",
    );

    const repo = createD1ChallengeRepository(env);
    await repo.create({
      title: "Invite",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "CODE1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
    });

    const found = await repo.getByInviteCode("code1");
    expect(found?.invite_code).toBe("CODE1");
  });

  test("fetches by id and updates status", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create(
      "c3@test.com",
      "Creator3",
      "hash",
      "UTC",
    );

    const repo = createD1ChallengeRepository(env);
    const challenge = await repo.create({
      title: "Status",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "STAT2",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
      status: "pending",
    });

    const fetched = await repo.getById(challenge.id);
    expect(fetched?.status).toBe("pending");

    await repo.updateStatus(challenge.id, "active");
    const updated = await repo.getById(challenge.id);
    expect(updated?.status).toBe("active");
  });

  test("lists by status and active mode", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create(
      "c4@test.com",
      "Creator4",
      "hash",
      "UTC",
    );

    const repo = createD1ChallengeRepository(env);
    await repo.create({
      title: "Pending",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "daily_winner",
      inviteCode: "PEND1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
      status: "pending",
    });

    await repo.create({
      title: "Active",
      description: null,
      creatorId: user.id,
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      mode: "cumulative",
      inviteCode: "ACT1",
      timezone: "UTC",
      isRecurring: false,
      recurringInterval: null,
      status: "active",
    });

    const pending = await repo.listByStatus("pending");
    expect(pending).toHaveLength(1);

    const activeCumulative = await repo.listActiveByMode("cumulative");
    expect(activeCumulative).toHaveLength(1);
    expect(activeCumulative[0].invite_code).toBe("ACT1");
  });
});
