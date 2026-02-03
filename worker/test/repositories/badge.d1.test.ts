import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1BadgeRepository } from "../../repositories/d1/badge.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 BadgeRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("awards unique badge", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("b@test.com", "Badge", "hash", "UTC");

    const repo = createD1BadgeRepository(env);
    const first = await repo.award(user.id, "daily_winner");
    const second = await repo.award(user.id, "daily_winner");

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  test("lists badges for user", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("b2@test.com", "Badge2", "hash", "UTC");

    const repo = createD1BadgeRepository(env);
    await repo.award(user.id, "daily_winner");

    const badges = await repo.listForUser(user.id);
    expect(badges).toHaveLength(1);
  });
});
