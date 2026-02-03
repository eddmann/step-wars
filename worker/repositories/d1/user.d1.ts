import type { Env, User } from "../../types";
import type { UserRepository } from "../interfaces/user.repository";

export function createD1UserRepository(env: Env): UserRepository {
  return {
    async getByEmail(email: string): Promise<User | null> {
      return await env.DB.prepare("SELECT * FROM users WHERE email = ?")
        .bind(email)
        .first<User>();
    },

    async getById(id: number): Promise<User | null> {
      return await env.DB.prepare("SELECT * FROM users WHERE id = ?")
        .bind(id)
        .first<User>();
    },

    async create(
      email: string,
      name: string,
      passwordHash: string,
      timezone: string,
    ): Promise<User> {
      const result = await env.DB.prepare(
        `INSERT INTO users (email, name, password_hash, timezone)
         VALUES (?, ?, ?, ?)
         RETURNING *`,
      )
        .bind(email, name, passwordHash, timezone)
        .first<User>();
      return result!;
    },

    async update(
      id: number,
      name: string,
      email: string,
      timezone?: string,
    ): Promise<User | null> {
      if (timezone) {
        return await env.DB.prepare(
          `UPDATE users SET name = ?, email = ?, timezone = ?, updated_at = datetime('now')
           WHERE id = ? RETURNING *`,
        )
          .bind(name, email, timezone, id)
          .first<User>();
      }
      return await env.DB.prepare(
        `UPDATE users SET name = ?, email = ?, updated_at = datetime('now')
         WHERE id = ? RETURNING *`,
      )
        .bind(name, email, id)
        .first<User>();
    },
  };
}
