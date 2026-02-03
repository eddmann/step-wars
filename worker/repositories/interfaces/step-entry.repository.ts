import type { StepEntry } from "../../types";

export interface StepEntryRepository {
  /**
   * Get a step entry by user and date
   */
  getByUserAndDate(userId: number, date: string): Promise<StepEntry | null>;

  /**
   * Upsert a step entry
   */
  upsert(
    userId: number,
    date: string,
    stepCount: number,
    source?: string,
  ): Promise<StepEntry>;

  /**
   * List all entries for a user (desc by date)
   */
  listForUser(userId: number): Promise<StepEntry[]>;

  /**
   * List most recent entries for a user
   */
  listRecentForUser(userId: number, limit: number): Promise<StepEntry[]>;

  /**
   * Get steps for a user on a specific date
   */
  getStepsForDate(userId: number, date: string): Promise<number>;

  /**
   * Sum steps for a user between dates (inclusive)
   */
  sumForUserBetweenDates(
    userId: number,
    startDate: string,
    endDate: string,
  ): Promise<number>;
}
