import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { notFound, forbidden } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";
import type { LeaderboardRepository } from "../repositories/interfaces/leaderboard.repository";
import { getDateTimeInTimezone } from "../../shared/dateUtils";
import {
  getEditCutoffDate,
  getLastFinalizedDate,
} from "../utils/leaderboard-cutoff";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface GetLeaderboardDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
  leaderboardRepository: LeaderboardRepository;
  clock?: Clock;
}

export interface GetLeaderboardInput {
  userId: number;
  challengeId: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  total_steps: number;
  total_points: number;
  is_current_user: boolean;
  last_finalized_steps: number | null;
}

export interface GetLeaderboardResult {
  challenge_id: number;
  mode: "daily_winner" | "cumulative";
  status: "pending" | "active" | "completed";
  leaderboard: LeaderboardEntry[];
  edit_cutoff_date: string;
  last_finalized_date: string | null;
}

export async function getLeaderboard(
  deps: GetLeaderboardDeps,
  input: GetLeaderboardInput,
): Promise<Result<GetLeaderboardResult, UseCaseError>> {
  const challenge = await deps.challengeRepository.getById(input.challengeId);
  if (!challenge) {
    return err(notFound("Challenge", input.challengeId));
  }

  const participant = await deps.participantRepository.isParticipant(
    input.challengeId,
    input.userId,
  );
  if (!participant) {
    return err(forbidden("Not a participant in this challenge"));
  }

  const now = (deps.clock ?? systemClock).now();
  const { date: today, hour } = getDateTimeInTimezone(challenge.timezone, now);
  const editCutoffDate = getEditCutoffDate(today, hour, challenge.timezone);

  const rawLeaderboard =
    await deps.leaderboardRepository.getChallengeLeaderboard(
      input.challengeId,
      challenge.start_date,
      challenge.end_date,
      today,
      editCutoffDate,
    );

  const rawLastFinalizedDate = getLastFinalizedDate(editCutoffDate);
  let lastFinalizedDate: string | null = null;
  if (challenge.status !== "completed") {
    if (
      rawLastFinalizedDate >= challenge.start_date &&
      rawLastFinalizedDate <= challenge.end_date
    ) {
      lastFinalizedDate = rawLastFinalizedDate;
    }
  }

  const lastFinalizedStepsMap = new Map<number, number>();
  if (lastFinalizedDate) {
    const lastFinalizedSteps =
      await deps.leaderboardRepository.getLastFinalizedSteps(
        input.challengeId,
        lastFinalizedDate,
      );
    for (const row of lastFinalizedSteps) {
      lastFinalizedStepsMap.set(row.user_id, row.steps);
    }
  }

  const sortedLeaderboard = [...rawLeaderboard].sort((a, b) => {
    if (challenge.mode === "daily_winner") {
      return b.total_points - a.total_points;
    }
    return b.confirmed_steps - a.confirmed_steps;
  });

  const leaderboard: LeaderboardEntry[] = sortedLeaderboard.map(
    (entry, index) => {
      const isCurrentUser = entry.user_id === input.userId;

      return {
        rank: index + 1,
        user_id: entry.user_id,
        name: entry.name,
        total_steps: isCurrentUser
          ? entry.confirmed_steps + entry.pending_steps
          : entry.confirmed_steps,
        total_points: entry.total_points,
        is_current_user: isCurrentUser,
        last_finalized_steps: lastFinalizedDate
          ? (lastFinalizedStepsMap.get(entry.user_id) ?? 0)
          : null,
      };
    },
  );

  return ok({
    challenge_id: input.challengeId,
    mode: challenge.mode,
    status: challenge.status,
    leaderboard,
    edit_cutoff_date: editCutoffDate,
    last_finalized_date: lastFinalizedDate,
  });
}
