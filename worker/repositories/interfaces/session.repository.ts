import type { Session } from "../../types";

export interface SessionRepository {
  /**
   * Create a session for a user
   */
  create(userId: number, token: string): Promise<void>;

  /**
   * Delete a session by token
   */
  delete(token: string): Promise<void>;

  /**
   * Get a session by token
   */
  getByToken(token: string): Promise<Session | null>;
}
