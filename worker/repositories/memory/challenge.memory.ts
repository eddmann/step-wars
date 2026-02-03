import type { Challenge } from "../../types";
import type {
  ChallengeRepository,
  CreateChallengeInput,
} from "../interfaces/challenge.repository";
import type { TestStore } from "../../test/setup";

export function createMemoryChallengeRepository(
  store: TestStore,
): ChallengeRepository {
  return {
    async create(input: CreateChallengeInput): Promise<Challenge> {
      const challenge: Challenge = {
        id: store.challenges.length + 1,
        title: input.title,
        description: input.description,
        creator_id: input.creatorId,
        start_date: input.startDate,
        end_date: input.endDate,
        mode: input.mode,
        invite_code: input.inviteCode,
        status: input.status ?? "pending",
        timezone: input.timezone,
        is_recurring: input.isRecurring ? 1 : 0,
        recurring_interval: input.recurringInterval,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.challenges.push(challenge);
      return challenge;
    },

    async getById(id: number): Promise<Challenge | null> {
      return store.challenges.find((c) => c.id === id) ?? null;
    },

    async getByInviteCode(inviteCode: string): Promise<Challenge | null> {
      return (
        store.challenges.find(
          (c) => c.invite_code === inviteCode.toUpperCase(),
        ) ?? null
      );
    },

    async listForUser(
      userId: number,
    ): Promise<(Challenge & { participant_count: number })[]> {
      const participantIds = store.participants
        .filter((p) => p.user_id === userId)
        .map((p) => p.challenge_id);

      return store.challenges
        .filter((c) => participantIds.includes(c.id))
        .map((c) => ({
          ...c,
          participant_count: store.participants.filter(
            (p) => p.challenge_id === c.id,
          ).length,
        }))
        .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
    },

    async listByStatus(status: Challenge["status"]): Promise<Challenge[]> {
      return store.challenges.filter((c) => c.status === status);
    },

    async listActiveByMode(mode: Challenge["mode"]): Promise<Challenge[]> {
      return store.challenges.filter(
        (c) => c.status === "active" && c.mode === mode,
      );
    },

    async updateStatus(id: number, status: Challenge["status"]): Promise<void> {
      const challenge = store.challenges.find((c) => c.id === id);
      if (!challenge) return;
      challenge.status = status;
      challenge.updated_at = new Date().toISOString();
    },
  };
}
