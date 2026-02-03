import type { Env, PendingNotification } from "../../types";
import type { NotificationRepository } from "../interfaces/notification.repository";

export function createD1NotificationRepository(
  env: Env,
): NotificationRepository {
  return {
    async listPending(userId: number): Promise<PendingNotification[]> {
      const result = await env.DB.prepare(
        `SELECT * FROM pending_notifications
         WHERE user_id = ? AND read_at IS NULL
         ORDER BY created_at DESC`,
      )
        .bind(userId)
        .all<PendingNotification>();
      return result.results;
    },

    async markAsRead(userId: number, notificationIds: number[]): Promise<void> {
      if (notificationIds.length === 0) return;

      const placeholders = notificationIds.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE pending_notifications
         SET read_at = datetime('now')
         WHERE id IN (${placeholders}) AND user_id = ?`,
      )
        .bind(...notificationIds, userId)
        .run();
    },

    async create(
      userId: number,
      type: string,
      title: string,
      message: string,
      badgeType: string | null,
      challengeId: number | null,
    ): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO pending_notifications (user_id, type, title, message, badge_type, challenge_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(userId, type, title, message, badgeType, challengeId)
        .run();
    },
  };
}
