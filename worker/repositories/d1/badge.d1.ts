import type { Env, UserBadge } from "../../types";
import type { BadgeRepository } from "../interfaces/badge.repository";

export function createD1BadgeRepository(env: Env): BadgeRepository {
  return {
    async listForUser(userId: number): Promise<UserBadge[]> {
      const result = await env.DB.prepare(
        "SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC",
      )
        .bind(userId)
        .all<UserBadge>();
      return result.results;
    },

    async award(userId: number, badgeType: string): Promise<UserBadge | null> {
      try {
        const result = await env.DB.prepare(
          `INSERT INTO user_badges (user_id, badge_type)
           VALUES (?, ?)
           RETURNING *`,
        )
          .bind(userId, badgeType)
          .first<UserBadge>();
        return result;
      } catch {
        // Returns null on duplicate key (user already has badge) - this is expected behavior.
        // The partial unique index on user_badges enforces one badge per user per type.
        return null;
      }
    },
  };
}
