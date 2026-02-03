import type { UserGoals } from "../../types";
import type { GoalsRepository } from "../interfaces/goals.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryGoalsRepository(store: TestStore): GoalsRepository {
  return {
    async getOrCreate(userId: number): Promise<UserGoals> {
      let goals = store.userGoals.find((g) => g.user_id === userId);
      if (!goals) {
        goals = {
          id: store.userGoals.length + 1,
          user_id: userId,
          daily_target: 10000,
          weekly_target: 70000,
          is_paused: 0,
          paused_at: null,
          current_streak: 0,
          longest_streak: 0,
          last_achieved_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.userGoals.push(goals);
      }
      return goals;
    },

    async update(
      userId: number,
      dailyTarget: number,
      weeklyTarget: number,
    ): Promise<UserGoals> {
      const goals = await this.getOrCreate(userId);
      goals.daily_target = dailyTarget;
      goals.weekly_target = weeklyTarget;
      goals.updated_at = new Date().toISOString();
      return goals;
    },

    async togglePause(userId: number, isPaused: boolean): Promise<UserGoals> {
      const goals = await this.getOrCreate(userId);
      goals.is_paused = isPaused ? 1 : 0;
      goals.paused_at = isPaused ? new Date().toISOString() : null;
      goals.updated_at = new Date().toISOString();
      return goals;
    },

    async updateStreak(
      userId: number,
      currentStreak: number,
      longestStreak: number,
      lastAchievedDate: string | null,
    ): Promise<void> {
      const goals = await this.getOrCreate(userId);
      goals.current_streak = currentStreak;
      goals.longest_streak = longestStreak;
      goals.last_achieved_date = lastAchievedDate;
      goals.updated_at = new Date().toISOString();
    },
  };
}
