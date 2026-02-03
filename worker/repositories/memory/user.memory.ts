import type { User } from "../../types";
import type { UserRepository } from "../interfaces/user.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryUserRepository(store: TestStore): UserRepository {
  return {
    async getByEmail(email: string): Promise<User | null> {
      return store.users.find((u) => u.email === email) ?? null;
    },

    async getById(id: number): Promise<User | null> {
      return store.users.find((u) => u.id === id) ?? null;
    },

    async create(
      email: string,
      name: string,
      passwordHash: string,
      timezone: string,
    ): Promise<User> {
      const user: User = {
        id: store.users.length + 1,
        email,
        name,
        password_hash: passwordHash,
        timezone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.users.push(user);
      return user;
    },

    async update(
      id: number,
      name: string,
      email: string,
      timezone?: string,
    ): Promise<User | null> {
      const user = store.users.find((u) => u.id === id);
      if (!user) return null;

      user.name = name;
      user.email = email;
      if (timezone) {
        user.timezone = timezone;
      }
      user.updated_at = new Date().toISOString();
      return user;
    },
  };
}
