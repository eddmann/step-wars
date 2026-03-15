import type { ReactionRepository } from "../interfaces/reaction.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryReactionRepository(
  store: TestStore,
): ReactionRepository {
  return {
    async add(
      reactorUserId: number,
      targetUserId: number,
      challengeId: number,
      date: string,
      reactionType: string,
    ): Promise<boolean> {
      const exists = store.reactions.some(
        (r) =>
          r.reactor_user_id === reactorUserId &&
          r.target_user_id === targetUserId &&
          r.challenge_id === challengeId &&
          r.date === date &&
          r.reaction_type === reactionType,
      );
      if (exists) return false;

      store.reactions.push({
        id: store.reactions.length + 1,
        reactor_user_id: reactorUserId,
        target_user_id: targetUserId,
        challenge_id: challengeId,
        date,
        reaction_type: reactionType,
        created_at: new Date().toISOString(),
      });
      return true;
    },

    async remove(
      reactorUserId: number,
      targetUserId: number,
      challengeId: number,
      date: string,
      reactionType: string,
    ): Promise<boolean> {
      const index = store.reactions.findIndex(
        (r) =>
          r.reactor_user_id === reactorUserId &&
          r.target_user_id === targetUserId &&
          r.challenge_id === challengeId &&
          r.date === date &&
          r.reaction_type === reactionType,
      );
      if (index === -1) return false;
      store.reactions.splice(index, 1);
      return true;
    },

    async getCountsForChallenge(
      challengeId: number,
      date: string,
    ): Promise<Map<number, Record<string, number>>> {
      const map = new Map<number, Record<string, number>>();
      for (const r of store.reactions) {
        if (r.challenge_id === challengeId && r.date === date) {
          if (!map.has(r.target_user_id)) {
            map.set(r.target_user_id, {});
          }
          const counts = map.get(r.target_user_id)!;
          counts[r.reaction_type] = (counts[r.reaction_type] ?? 0) + 1;
        }
      }
      return map;
    },

    async getUserReactionsForChallenge(
      reactorUserId: number,
      challengeId: number,
      date: string,
    ): Promise<Map<number, string[]>> {
      const map = new Map<number, string[]>();
      for (const r of store.reactions) {
        if (
          r.reactor_user_id === reactorUserId &&
          r.challenge_id === challengeId &&
          r.date === date
        ) {
          if (!map.has(r.target_user_id)) {
            map.set(r.target_user_id, []);
          }
          map.get(r.target_user_id)!.push(r.reaction_type);
        }
      }
      return map;
    },
  };
}
