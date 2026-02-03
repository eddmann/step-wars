import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1StepEntryRepository } from "../../repositories/d1/step-entry.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 StepEntryRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("upserts and fetches entry", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("se@test.com", "Steps", "hash", "UTC");

    const repo = createD1StepEntryRepository(env);
    const entry = await repo.upsert(user.id, "2026-01-01", 1234, "manual");
    const fetched = await repo.getByUserAndDate(user.id, "2026-01-01");

    expect(fetched?.id).toBe(entry.id);
  });

  test("sums entries between dates", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("se2@test.com", "Steps2", "hash", "UTC");

    const repo = createD1StepEntryRepository(env);
    await repo.upsert(user.id, "2026-01-01", 1000, "manual");
    await repo.upsert(user.id, "2026-01-02", 2000, "manual");
    await repo.upsert(user.id, "2026-01-03", 3000, "manual");

    const total = await repo.sumForUserBetweenDates(
      user.id,
      "2026-01-01",
      "2026-01-02",
    );
    expect(total).toBe(3000);
  });

  test("lists entries for user in descending order", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("se3@test.com", "Steps3", "hash", "UTC");

    const repo = createD1StepEntryRepository(env);
    await repo.upsert(user.id, "2026-01-01", 1000, "manual");
    await repo.upsert(user.id, "2026-01-03", 3000, "manual");
    await repo.upsert(user.id, "2026-01-02", 2000, "manual");

    const entries = await repo.listForUser(user.id);
    expect(entries.map((entry) => entry.date)).toEqual([
      "2026-01-03",
      "2026-01-02",
      "2026-01-01",
    ]);
  });

  test("lists recent entries with limit", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("se4@test.com", "Steps4", "hash", "UTC");

    const repo = createD1StepEntryRepository(env);
    await repo.upsert(user.id, "2026-01-01", 1000, "manual");
    await repo.upsert(user.id, "2026-01-02", 2000, "manual");
    await repo.upsert(user.id, "2026-01-03", 3000, "manual");

    const entries = await repo.listRecentForUser(user.id, 2);
    expect(entries).toHaveLength(2);
    expect(entries[0].date).toBe("2026-01-03");
    expect(entries[1].date).toBe("2026-01-02");
  });

  test("gets steps for date with default zero", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("se5@test.com", "Steps5", "hash", "UTC");

    const repo = createD1StepEntryRepository(env);
    await repo.upsert(user.id, "2026-01-01", 1234, "manual");

    const steps = await repo.getStepsForDate(user.id, "2026-01-01");
    expect(steps).toBe(1234);

    const missing = await repo.getStepsForDate(user.id, "2026-01-02");
    expect(missing).toBe(0);
  });
});
