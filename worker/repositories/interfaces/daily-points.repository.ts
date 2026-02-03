export interface DailyPointsRow {
  user_id: number;
  points: number;
}

export interface DailyPointsRepository {
  /**
   * Check if points are finalized for a challenge/date
   */
  hasPointsForDate(challengeId: number, date: string): Promise<boolean>;

  /**
   * List points awarded for a challenge/date
   */
  listForDate(challengeId: number, date: string): Promise<DailyPointsRow[]>;

  /**
   * Upsert points for a user on a challenge/date
   */
  upsert(
    challengeId: number,
    userId: number,
    date: string,
    points: number,
  ): Promise<void>;

  /**
   * Get the overall points winner for a challenge
   */
  getTotalPointsForChallenge(
    challengeId: number,
  ): Promise<{ user_id: number; name: string; score: number } | null>;
}
