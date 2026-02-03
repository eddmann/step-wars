import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1SessionRepository } from "../../repositories/d1/session.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

describe("D1 SessionRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("creates and fetches session", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("s@test.com", "Sess", "hash", "UTC");

    const repo = createD1SessionRepository(env);
    await repo.create(user.id, "token-1");

    const fetched = await repo.getByToken("token-1");
    expect(fetched?.user_id).toBe(user.id);
  });

  test("returns null for expired session", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("s2@test.com", "Sess2", "hash", "UTC");

    await env.DB.prepare(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES (?, ?, ?)`,
    )
      .bind(user.id, "expired", isoDaysFromNow(-1))
      .run();

    const repo = createD1SessionRepository(env);
    const fetched = await repo.getByToken("expired");
    expect(fetched).toBeNull();
  });

  test("deletes session", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("s3@test.com", "Sess3", "hash", "UTC");

    const repo = createD1SessionRepository(env);
    await repo.create(user.id, "token-2");
    await repo.delete("token-2");

    const fetched = await repo.getByToken("token-2");
    expect(fetched).toBeNull();
  });
});
