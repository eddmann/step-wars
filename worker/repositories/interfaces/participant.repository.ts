export interface ChallengeParticipantRow {
  user_id: number;
  name: string;
  joined_at: string;
}

export interface ParticipantRepository {
  /**
   * Join a challenge (returns false if already joined)
   */
  join(challengeId: number, userId: number): Promise<boolean>;

  /**
   * Check whether a user is a participant
   */
  isParticipant(challengeId: number, userId: number): Promise<boolean>;

  /**
   * List participants for a challenge
   */
  listParticipants(challengeId: number): Promise<ChallengeParticipantRow[]>;
}
