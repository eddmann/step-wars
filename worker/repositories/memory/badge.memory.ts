import type { UserBadge } from "../../types";
import type { BadgeRepository } from "../interfaces/badge.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryBadgeRepository(store: TestStore): BadgeRepository {
  return {
    async listForUser(userId: number): Promise<UserBadge[]> {
      return store.userBadges
        .filter((b) => b.user_id === userId)
        .sort((a, b) => (a.earned_at < b.earned_at ? 1 : -1));
    },

    async award(userId: number, badgeType: string): Promise<UserBadge | null> {
      const exists = store.userBadges.find(
        (b) => b.user_id === userId && b.badge_type === badgeType,
      );
      if (exists) return null;

      const badge: UserBadge = {
        id: store.userBadges.length + 1,
        user_id: userId,
        badge_type: badgeType,
        earned_at: new Date().toISOString(),
      };
      store.userBadges.push(badge);
      return badge;
    },
  };
}
