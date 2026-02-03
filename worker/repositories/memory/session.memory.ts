import type { Session } from "../../types";
import type { SessionRepository } from "../interfaces/session.repository";
import type { TestStore } from "../../test/setup";

export function createMemorySessionRepository(
  store: TestStore,
): SessionRepository {
  return {
    async create(userId: number, token: string): Promise<void> {
      const session: Session = {
        id: store.sessions.length + 1,
        user_id: userId,
        token,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        created_at: new Date().toISOString(),
      };
      store.sessions.push(session);
    },

    async delete(token: string): Promise<void> {
      store.sessions = store.sessions.filter((s) => s.token !== token);
    },

    async getByToken(token: string): Promise<Session | null> {
      const session = store.sessions.find((s) => s.token === token) ?? null;
      if (!session) return null;
      if (new Date(session.expires_at).getTime() <= Date.now()) {
        return null;
      }
      return session;
    },
  };
}
