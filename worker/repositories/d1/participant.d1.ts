import type { Env } from "../../types";
import type {
  ParticipantRepository,
  ChallengeParticipantRow,
} from "../interfaces/participant.repository";

export function createD1ParticipantRepository(env: Env): ParticipantRepository {
  return {
    async join(challengeId: number, userId: number): Promise<boolean> {
      try {
        await env.DB.prepare(
          `INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)`,
        )
          .bind(challengeId, userId)
          .run();
        return true;
      } catch {
        // Returns false on duplicate key (user already in challenge) - this is expected behavior.
        // The unique constraint on (challenge_id, user_id) prevents duplicate joins.
        return false;
      }
    },

    async isParticipant(challengeId: number, userId: number): Promise<boolean> {
      const result = await env.DB.prepare(
        `SELECT 1 FROM challenge_participants WHERE challenge_id = ? AND user_id = ?`,
      )
        .bind(challengeId, userId)
        .first();
      return result !== null;
    },

    async listParticipants(
      challengeId: number,
    ): Promise<ChallengeParticipantRow[]> {
      const result = await env.DB.prepare(
        `SELECT u.id as user_id, u.name, cp.joined_at
         FROM challenge_participants cp
         INNER JOIN users u ON cp.user_id = u.id
         WHERE cp.challenge_id = ?
         ORDER BY cp.joined_at`,
      )
        .bind(challengeId)
        .all<ChallengeParticipantRow>();
      return result.results;
    },
  };
}
