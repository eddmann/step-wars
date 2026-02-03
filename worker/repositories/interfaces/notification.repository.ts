import type { PendingNotification } from "../../types";

export interface NotificationRepository {
  /**
   * List unread notifications for a user
   */
  listPending(userId: number): Promise<PendingNotification[]>;

  /**
   * Mark notifications as read
   */
  markAsRead(userId: number, notificationIds: number[]): Promise<void>;

  /**
   * Create a notification
   */
  create(
    userId: number,
    type: string,
    title: string,
    message: string,
    badgeType: string | null,
    challengeId: number | null,
  ): Promise<void>;
}
