import type { Env, Session } from "../../types";
import type { SessionRepository } from "../interfaces/session.repository";

export function createD1SessionRepository(env: Env): SessionRepository {
  return {
    async create(userId: number, token: string): Promise<void> {
      await env.DB.prepare(
        `INSERT INTO sessions (user_id, token, expires_at)
         VALUES (?, ?, datetime('now', '+30 days'))`,
      )
        .bind(userId, token)
        .run();
    },

    async delete(token: string): Promise<void> {
      await env.DB.prepare("DELETE FROM sessions WHERE token = ?")
        .bind(token)
        .run();
    },

    async getByToken(token: string): Promise<Session | null> {
      return await env.DB.prepare(
        "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')",
      )
        .bind(token)
        .first<Session>();
    },
  };
}
