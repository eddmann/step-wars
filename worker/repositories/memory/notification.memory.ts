import type { PendingNotification } from "../../types";
import type { NotificationRepository } from "../interfaces/notification.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryNotificationRepository(
  store: TestStore,
): NotificationRepository {
  return {
    async listPending(userId: number): Promise<PendingNotification[]> {
      return store.notifications
        .filter((n) => n.user_id === userId && n.read_at === null)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    },

    async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
      for (const notification of store.notifications) {
        if (
          notification.user_id === userId &&
          notificationIds.includes(notification.id)
        ) {
          notification.read_at = new Date().toISOString();
        }
      }
    },

    async create(
      userId: number,
      type: string,
      title: string,
      message: string,
      badgeType: string | null,
      challengeId: number | null,
    ): Promise<void> {
      store.notifications.push({
        id: store.notifications.length + 1,
        user_id: userId,
        type: type as PendingNotification["type"],
        title,
        message,
        badge_type: badgeType,
        challenge_id: challengeId,
        created_at: new Date().toISOString(),
        read_at: null,
      });
    },
  };
}
