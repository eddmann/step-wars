import type {
  LeaderboardRepository,
  LeaderboardRow,
  DailyStepsRow,
  WinnerRow,
} from "../interfaces/leaderboard.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryLeaderboardRepository(
  store: TestStore,
): LeaderboardRepository {
  return {
    async getChallengeLeaderboard(
      challengeId: number,
      challengeStartDate: string,
      challengeEndDate: string,
      today: string,
      editCutoffDate: string,
    ): Promise<LeaderboardRow[]> {
      const participantIds = store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => p.user_id);

      return participantIds.map((userId) => {
        const user = store.users.find((u) => u.id === userId);
        const confirmed_steps = store.stepEntries
          .filter(
            (e) =>
              e.user_id === userId &&
              e.date >= challengeStartDate &&
              e.date <= challengeEndDate &&
              e.date < editCutoffDate,
          )
          .reduce((sum, e) => sum + e.step_count, 0);

        const pending_steps = store.stepEntries
          .filter(
            (e) =>
              e.user_id === userId &&
              e.date >= challengeStartDate &&
              e.date <= challengeEndDate &&
              e.date >= editCutoffDate,
          )
          .reduce((sum, e) => sum + e.step_count, 0);

        const total_points = store.dailyPoints
          .filter((p) => p.challenge_id === challengeId && p.user_id === userId)
          .reduce((sum, p) => sum + p.points, 0);

        const todayEntry = store.stepEntries.find(
          (e) => e.user_id === userId && e.date === today,
        );

        return {
          user_id: userId,
          name: user?.name ?? "Unknown",
          confirmed_steps,
          pending_steps,
          total_points,
          today_steps: todayEntry ? todayEntry.step_count : 0,
        };
      });
    },

    async getLastFinalizedSteps(
      challengeId: number,
      date: string,
    ): Promise<{ user_id: number; steps: number }[]> {
      const participantIds = store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => p.user_id);

      return participantIds.map((userId) => {
        const entry = store.stepEntries.find(
          (e) => e.user_id === userId && e.date === date,
        );
        return { user_id: userId, steps: entry ? entry.step_count : 0 };
      });
    },

    async getDailyStepsForChallenge(
      challengeId: number,
      date: string,
    ): Promise<DailyStepsRow[]> {
      const participantIds = store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => p.user_id);

      return participantIds
        .map((userId) => {
          const user = store.users.find((u) => u.id === userId);
          const entry = store.stepEntries.find(
            (e) => e.user_id === userId && e.date === date,
          );
          return {
            user_id: userId,
            name: user?.name ?? "Unknown",
            steps: entry ? entry.step_count : 0,
          };
        })
        .sort((a, b) => b.steps - a.steps);
    },

    async getCumulativeWinner(
      challengeId: number,
      startDate: string,
      endDate: string,
    ): Promise<WinnerRow | null> {
      const participantIds = store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => p.user_id);

      let winner: WinnerRow | null = null;
      for (const userId of participantIds) {
        const score = store.stepEntries
          .filter(
            (e) =>
              e.user_id === userId && e.date >= startDate && e.date <= endDate,
          )
          .reduce((sum, e) => sum + e.step_count, 0);
        const user = store.users.find((u) => u.id === userId);
        if (!user) continue;
        if (!winner || score > winner.score) {
          winner = { user_id: userId, name: user.name, score };
        }
      }

      return winner;
    },

    async getPointsWinner(challengeId: number): Promise<WinnerRow | null> {
      const participantIds = store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => p.user_id);

      let winner: WinnerRow | null = null;
      for (const userId of participantIds) {
        const score = store.dailyPoints
          .filter((p) => p.challenge_id === challengeId && p.user_id === userId)
          .reduce((sum, p) => sum + p.points, 0);
        const user = store.users.find((u) => u.id === userId);
        if (!user) continue;
        if (!winner || score > winner.score) {
          winner = { user_id: userId, name: user.name, score };
        }
      }

      return winner;
    },
  };
}
