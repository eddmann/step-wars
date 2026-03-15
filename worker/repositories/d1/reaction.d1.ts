import type { Env } from "../../types";
import type { ReactionRepository } from "../interfaces/reaction.repository";

export function createD1ReactionRepository(env: Env): ReactionRepository {
  return {
    async add(
      reactorUserId: number,
      targetUserId: number,
      challengeId: number,
      date: string,
      reactionType: string,
    ): Promise<boolean> {
      try {
        await env.DB.prepare(
          `INSERT INTO reactions (reactor_user_id, target_user_id, challenge_id, date, reaction_type)
           VALUES (?, ?, ?, ?, ?)`,
        )
          .bind(reactorUserId, targetUserId, challengeId, date, reactionType)
          .run();
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("UNIQUE constraint failed")) {
          return false;
        }
        throw e;
      }
    },

    async remove(
      reactorUserId: number,
      targetUserId: number,
      challengeId: number,
      date: string,
      reactionType: string,
    ): Promise<boolean> {
      const result = await env.DB.prepare(
        `DELETE FROM reactions
         WHERE reactor_user_id = ? AND target_user_id = ? AND challenge_id = ? AND date = ? AND reaction_type = ?`,
      )
        .bind(reactorUserId, targetUserId, challengeId, date, reactionType)
        .run();
      return (result.meta?.changes ?? 0) > 0;
    },

    async getCountsForChallenge(
      challengeId: number,
      date: string,
    ): Promise<Map<number, Record<string, number>>> {
      const result = await env.DB.prepare(
        `SELECT target_user_id, reaction_type, COUNT(*) as count
         FROM reactions
         WHERE challenge_id = ? AND date = ?
         GROUP BY target_user_id, reaction_type`,
      )
        .bind(challengeId, date)
        .all<{
          target_user_id: number;
          reaction_type: string;
          count: number;
        }>();

      const map = new Map<number, Record<string, number>>();
      for (const row of result.results) {
        if (!map.has(row.target_user_id)) {
          map.set(row.target_user_id, {});
        }
        map.get(row.target_user_id)![row.reaction_type] = row.count;
      }
      return map;
    },

    async getUserReactionsForChallenge(
      reactorUserId: number,
      challengeId: number,
      date: string,
    ): Promise<Map<number, string[]>> {
      const result = await env.DB.prepare(
        `SELECT target_user_id, reaction_type
         FROM reactions
         WHERE reactor_user_id = ? AND challenge_id = ? AND date = ?`,
      )
        .bind(reactorUserId, challengeId, date)
        .all<{ target_user_id: number; reaction_type: string }>();

      const map = new Map<number, string[]>();
      for (const row of result.results) {
        if (!map.has(row.target_user_id)) {
          map.set(row.target_user_id, []);
        }
        map.get(row.target_user_id)!.push(row.reaction_type);
      }
      return map;
    },
  };
}
