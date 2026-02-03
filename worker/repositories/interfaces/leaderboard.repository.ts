export interface LeaderboardRow {
  user_id: number;
  name: string;
  confirmed_steps: number;
  pending_steps: number;
  total_points: number;
  today_steps: number;
}

export interface DailyStepsRow {
  user_id: number;
  name: string;
  steps: number;
}

export interface WinnerRow {
  user_id: number;
  name: string;
  score: number;
}

export interface LeaderboardRepository {
  /**
   * Get leaderboard rows for a challenge, split by confirmed/pending
   */
  getChallengeLeaderboard(
    challengeId: number,
    challengeStartDate: string,
    challengeEndDate: string,
    today: string,
    editCutoffDate: string,
  ): Promise<LeaderboardRow[]>;

  /**
   * Get last finalized steps for a challenge/date
   */
  getLastFinalizedSteps(
    challengeId: number,
    date: string,
  ): Promise<{ user_id: number; steps: number }[]>;

  /**
   * Get daily steps for a challenge/date
   */
  getDailyStepsForChallenge(
    challengeId: number,
    date: string,
  ): Promise<DailyStepsRow[]>;

  /**
   * Get cumulative winner for a challenge window
   */
  getCumulativeWinner(
    challengeId: number,
    startDate: string,
    endDate: string,
  ): Promise<WinnerRow | null>;

  /**
   * Get points winner for a challenge
   */
  getPointsWinner(challengeId: number): Promise<WinnerRow | null>;
}
