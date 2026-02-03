import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 UserRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("creates user and fetches by email", async () => {
    const repo = createD1UserRepository(env);
    const user = await repo.create("a@test.com", "Alice", "hash", "UTC");

    const fetched = await repo.getByEmail("a@test.com");
    expect(fetched?.id).toBe(user.id);
  });

  test("updates user", async () => {
    const repo = createD1UserRepository(env);
    const user = await repo.create("b@test.com", "Bob", "hash", "UTC");

    const updated = await repo.update(
      user.id,
      "Bobby",
      "bobby@test.com",
      "UTC",
    );
    expect(updated?.name).toBe("Bobby");
    expect(updated?.email).toBe("bobby@test.com");
  });

  test("fetches by id", async () => {
    const repo = createD1UserRepository(env);
    const user = await repo.create("c@test.com", "Cathy", "hash", "UTC");

    const fetched = await repo.getById(user.id);
    expect(fetched?.email).toBe("c@test.com");
  });
});
