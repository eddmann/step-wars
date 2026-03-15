export interface ReactionRepository {
  add(
    reactorUserId: number,
    targetUserId: number,
    challengeId: number,
    date: string,
    reactionType: string,
  ): Promise<boolean>;

  remove(
    reactorUserId: number,
    targetUserId: number,
    challengeId: number,
    date: string,
    reactionType: string,
  ): Promise<boolean>;

  getCountsForChallenge(
    challengeId: number,
    date: string,
  ): Promise<Map<number, Record<string, number>>>;

  getUserReactionsForChallenge(
    reactorUserId: number,
    challengeId: number,
    date: string,
  ): Promise<Map<number, string[]>>;
}
