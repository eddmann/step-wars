import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1GoalsRepository } from "../../repositories/d1/goals.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 GoalsRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("creates goals on demand", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("g@test.com", "Goals", "hash", "UTC");

    const repo = createD1GoalsRepository(env);
    const goals = await repo.getOrCreate(user.id);
    expect(goals.user_id).toBe(user.id);
  });

  test("updates targets", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("g2@test.com", "Goals2", "hash", "UTC");

    const repo = createD1GoalsRepository(env);
    await repo.getOrCreate(user.id);
    const updated = await repo.update(user.id, 12000, 80000);

    expect(updated.daily_target).toBe(12000);
    expect(updated.weekly_target).toBe(80000);
  });

  test("toggles pause state", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("g3@test.com", "Goals3", "hash", "UTC");

    const repo = createD1GoalsRepository(env);
    await repo.getOrCreate(user.id);

    const paused = await repo.togglePause(user.id, true);
    expect(paused.is_paused).toBe(1);
    expect(paused.paused_at).not.toBeNull();

    const resumed = await repo.togglePause(user.id, false);
    expect(resumed.is_paused).toBe(0);
    expect(resumed.paused_at).toBeNull();
  });

  test("updates streak fields", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("g4@test.com", "Goals4", "hash", "UTC");

    const repo = createD1GoalsRepository(env);
    await repo.getOrCreate(user.id);

    await repo.updateStreak(user.id, 5, 10, "2026-01-05");
    const updated = await repo.getOrCreate(user.id);

    expect(updated.current_streak).toBe(5);
    expect(updated.longest_streak).toBe(10);
    expect(updated.last_achieved_date).toBe("2026-01-05");
  });
});
