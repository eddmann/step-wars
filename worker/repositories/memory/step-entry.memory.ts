import type { StepEntry } from "../../types";
import type { StepEntryRepository } from "../interfaces/step-entry.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryStepEntryRepository(
  store: TestStore,
): StepEntryRepository {
  return {
    async getByUserAndDate(
      userId: number,
      date: string,
    ): Promise<StepEntry | null> {
      return (
        store.stepEntries.find(
          (e) => e.user_id === userId && e.date === date,
        ) ?? null
      );
    },

    async upsert(
      userId: number,
      date: string,
      stepCount: number,
      source: string = "manual",
    ): Promise<StepEntry> {
      const existing = store.stepEntries.find(
        (e) => e.user_id === userId && e.date === date,
      );
      if (existing) {
        existing.step_count = stepCount;
        existing.source = source;
        existing.updated_at = new Date().toISOString();
        return existing;
      }

      const entry: StepEntry = {
        id: store.stepEntries.length + 1,
        user_id: userId,
        date,
        step_count: stepCount,
        source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.stepEntries.push(entry);
      return entry;
    },

    async listForUser(userId: number): Promise<StepEntry[]> {
      return store.stepEntries
        .filter((e) => e.user_id === userId)
        .sort((a, b) => (a.date < b.date ? 1 : -1));
    },

    async listRecentForUser(
      userId: number,
      limit: number,
    ): Promise<StepEntry[]> {
      return store.stepEntries
        .filter((e) => e.user_id === userId)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, limit);
    },

    async getStepsForDate(userId: number, date: string): Promise<number> {
      const entry = store.stepEntries.find(
        (e) => e.user_id === userId && e.date === date,
      );
      return entry ? entry.step_count : 0;
    },

    async sumForUserBetweenDates(
      userId: number,
      startDate: string,
      endDate: string,
    ): Promise<number> {
      return store.stepEntries
        .filter(
          (e) =>
            e.user_id === userId && e.date >= startDate && e.date <= endDate,
        )
        .reduce((sum, entry) => sum + entry.step_count, 0);
    },
  };
}
