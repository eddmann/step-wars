import type {
  DailyPointsRepository,
  DailyPointsRow,
} from "../interfaces/daily-points.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryDailyPointsRepository(
  store: TestStore,
): DailyPointsRepository {
  return {
    async hasPointsForDate(
      challengeId: number,
      date: string,
    ): Promise<boolean> {
      return (
        store.dailyPoints.find(
          (p) => p.challenge_id === challengeId && p.date === date,
        ) !== undefined
      );
    },

    async listForDate(
      challengeId: number,
      date: string,
    ): Promise<DailyPointsRow[]> {
      return store.dailyPoints
        .filter((p) => p.challenge_id === challengeId && p.date === date)
        .map((p) => ({ user_id: p.user_id, points: p.points }));
    },

    async upsert(
      challengeId: number,
      userId: number,
      date: string,
      points: number,
    ): Promise<void> {
      const existing = store.dailyPoints.find(
        (p) =>
          p.challenge_id === challengeId &&
          p.user_id === userId &&
          p.date === date,
      );
      if (existing) {
        existing.points = points;
        return;
      }
      store.dailyPoints.push({
        id: store.dailyPoints.length + 1,
        challenge_id: challengeId,
        user_id: userId,
        date,
        points,
      });
    },

    async getTotalPointsForChallenge(
      challengeId: number,
    ): Promise<{ user_id: number; name: string; score: number } | null> {
      const totals = new Map<number, number>();
      for (const entry of store.dailyPoints.filter(
        (p) => p.challenge_id === challengeId,
      )) {
        totals.set(
          entry.user_id,
          (totals.get(entry.user_id) ?? 0) + entry.points,
        );
      }
      let winner: { user_id: number; name: string; score: number } | null =
        null;
      for (const [userId, score] of totals.entries()) {
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
