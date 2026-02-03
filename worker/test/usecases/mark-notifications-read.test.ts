import { describe, test, expect, beforeEach } from "bun:test";
import { markNotificationsRead } from "../../usecases/mark-notifications-read.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createNotification, resetAllFixtureCounters } from "../fixtures";

describe("markNotificationsRead", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("marks notifications as read", async () => {
    const store = createTestStore();
    const notif1 = createNotification({ id: 1, user_id: 1 });
    const notif2 = createNotification({ id: 2, user_id: 1 });
    seedTestStore(store, { notifications: [notif1, notif2] });

    const { notificationRepository } = createMemoryRepos(store);

    const result = await markNotificationsRead(
      { notificationRepository },
      { userId: 1, notificationIds: [1] },
    );

    expect(result.ok).toBe(true);
    expect(store.notifications.find((n) => n.id === 1)?.read_at).not.toBeNull();
    expect(store.notifications.find((n) => n.id === 2)?.read_at).toBeNull();
  });
});
