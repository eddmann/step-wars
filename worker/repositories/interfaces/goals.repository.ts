import type { UserGoals } from "../../types";

export interface GoalsRepository {
  /**
   * Get goals for a user, creating defaults if needed
   */
  getOrCreate(userId: number): Promise<UserGoals>;

  /**
   * Update daily and weekly targets
   */
  update(
    userId: number,
    dailyTarget: number,
    weeklyTarget: number,
  ): Promise<UserGoals>;

  /**
   * Pause or resume goals tracking
   */
  togglePause(userId: number, isPaused: boolean): Promise<UserGoals>;

  /**
   * Update streak tracking fields
   */
  updateStreak(
    userId: number,
    currentStreak: number,
    longestStreak: number,
    lastAchievedDate: string | null,
  ): Promise<void>;
}
