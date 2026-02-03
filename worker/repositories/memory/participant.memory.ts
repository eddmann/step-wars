import type {
  ParticipantRepository,
  ChallengeParticipantRow,
} from "../interfaces/participant.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryParticipantRepository(
  store: TestStore,
): ParticipantRepository {
  return {
    async join(challengeId: number, userId: number): Promise<boolean> {
      const exists = store.participants.find(
        (p) => p.challenge_id === challengeId && p.user_id === userId,
      );
      if (exists) return false;

      store.participants.push({
        id: store.participants.length + 1,
        challenge_id: challengeId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      });
      return true;
    },

    async isParticipant(challengeId: number, userId: number): Promise<boolean> {
      return (
        store.participants.find(
          (p) => p.challenge_id === challengeId && p.user_id === userId,
        ) !== undefined
      );
    },

    async listParticipants(
      challengeId: number,
    ): Promise<ChallengeParticipantRow[]> {
      return store.participants
        .filter((p) => p.challenge_id === challengeId)
        .map((p) => {
          const user = store.users.find((u) => u.id === p.user_id);
          return {
            user_id: p.user_id,
            name: user?.name ?? "Unknown",
            joined_at: p.joined_at,
          };
        })
        .sort((a, b) => (a.joined_at > b.joined_at ? 1 : -1));
    },
  };
}
