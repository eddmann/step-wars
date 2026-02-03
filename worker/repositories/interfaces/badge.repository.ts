import type { UserBadge } from "../../types";

export interface BadgeRepository {
  /**
   * List all badges earned by a user
   */
  listForUser(userId: number): Promise<UserBadge[]>;

  /**
   * Award a badge if the user doesn't already have it
   */
  award(userId: number, badgeType: string): Promise<UserBadge | null>;
}
