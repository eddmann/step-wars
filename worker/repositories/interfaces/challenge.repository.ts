import type { Challenge } from "../../types";

export interface CreateChallengeInput {
  title: string;
  description: string | null;
  creatorId: number;
  startDate: string;
  endDate: string;
  mode: "daily_winner" | "cumulative";
  inviteCode: string;
  timezone: string;
  isRecurring: boolean;
  recurringInterval: "weekly" | "monthly" | null;
  status?: Challenge["status"];
}

export interface ChallengeRepository {
  /**
   * Create a new challenge
   */
  create(input: CreateChallengeInput): Promise<Challenge>;

  /**
   * Get a challenge by ID
   */
  getById(id: number): Promise<Challenge | null>;

  /**
   * Get a challenge by invite code
   */
  getByInviteCode(inviteCode: string): Promise<Challenge | null>;

  /**
   * List challenges for a user with participant counts
   */
  listForUser(
    userId: number,
  ): Promise<(Challenge & { participant_count: number })[]>;

  /**
   * List challenges by status
   */
  listByStatus(status: Challenge["status"]): Promise<Challenge[]>;

  /**
   * List active challenges for a given mode
   */
  listActiveByMode(mode: Challenge["mode"]): Promise<Challenge[]>;

  /**
   * Update a challenge status
   */
  updateStatus(id: number, status: Challenge["status"]): Promise<void>;
}
