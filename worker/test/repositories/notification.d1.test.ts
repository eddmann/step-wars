import { describe, test, beforeEach, expect } from "bun:test";
import { createTestD1Env, clearD1Tables } from "../d1-setup";
import { createD1NotificationRepository } from "../../repositories/d1/notification.d1";
import { createD1UserRepository } from "../../repositories/d1/user.d1";

describe("D1 NotificationRepository", () => {
  let env: Awaited<ReturnType<typeof createTestD1Env>>;

  beforeEach(async () => {
    env = await createTestD1Env();
    await clearD1Tables(env);
  });

  test("creates and lists pending notifications", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("n@test.com", "Notify", "hash", "UTC");

    const repo = createD1NotificationRepository(env);
    await repo.create(
      user.id,
      "daily_win",
      "Daily Winner!",
      "Nice work",
      "daily_winner",
      null,
    );

    const pending = await repo.listPending(user.id);
    expect(pending).toHaveLength(1);
  });

  test("marks notifications as read", async () => {
    const userRepo = createD1UserRepository(env);
    const user = await userRepo.create("n2@test.com", "Notify2", "hash", "UTC");

    const repo = createD1NotificationRepository(env);
    await repo.create(
      user.id,
      "daily_win",
      "Daily Winner!",
      "Nice work",
      "daily_winner",
      null,
    );

    const pending = await repo.listPending(user.id);
    await repo.markAsRead(user.id, [pending[0].id]);

    const pendingAfter = await repo.listPending(user.id);
    expect(pendingAfter).toHaveLength(0);
  });
});
