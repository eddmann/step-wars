import type { User } from "../../types";

export interface UserRepository {
  /**
   * Get a user by email
   */
  getByEmail(email: string): Promise<User | null>;

  /**
   * Get a user by ID
   */
  getById(id: number): Promise<User | null>;

  /**
   * Create a new user
   */
  create(
    email: string,
    name: string,
    passwordHash: string,
    timezone: string,
  ): Promise<User>;

  /**
   * Update user profile fields
   */
  update(
    id: number,
    name: string,
    email: string,
    timezone?: string,
  ): Promise<User | null>;
}
