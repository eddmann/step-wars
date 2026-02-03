export interface UserStats {
  total_steps: number;
  challenges_joined: number;
  challenges_won: number;
  badges_earned: number;
}

export interface StatsRepository {
  /**
   * Get aggregate stats for a user
   */
  getUserStats(userId: number): Promise<UserStats>;
}
