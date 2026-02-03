import type { Result } from "../utils/result";
import { ok, err } from "../utils/result";
import type { UseCaseError } from "./errors";
import { notFound, forbidden } from "./errors";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";
import type { LeaderboardRepository } from "../repositories/interfaces/leaderboard.repository";
import type { DailyPointsRepository } from "../repositories/interfaces/daily-points.repository";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";
import { getDateTimeInTimezone } from "../../shared/dateUtils";
import { getDateRange } from "../utils/date-range";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

interface DayRanking {
  rank: number;
  user_id: number;
  name: string;
  steps: number | null;
  points: number;
  is_current_user: boolean;
}

interface DaySummary {
  date: string;
  status: "finalized" | "pending";
  rankings: DayRanking[];
}

export interface GetDailyBreakdownDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
  leaderboardRepository: LeaderboardRepository;
  dailyPointsRepository: DailyPointsRepository;
  clock?: Clock;
}

export interface GetDailyBreakdownInput {
  userId: number;
  challengeId: number;
}

export interface GetDailyBreakdownResult {
  challenge_id: number;
  challenge_title: string;
  mode: "daily_winner" | "cumulative";
  days: DaySummary[];
}

export async function getDailyBreakdown(
  deps: GetDailyBreakdownDeps,
  input: GetDailyBreakdownInput,
): Promise<Result<GetDailyBreakdownResult, UseCaseError>> {
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
  const effectiveEndDate =
    challenge.end_date < today ? challenge.end_date : today;

  if (challenge.start_date > today) {
    return ok({
      challenge_id: input.challengeId,
      challenge_title: challenge.title,
      mode: challenge.mode,
      days: [],
    });
  }

  const dates = getDateRange(challenge.start_date, effectiveEndDate);

  const isDateFinalized = (date: string): boolean => {
    if (date < today) {
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const yesterday = `${y}-${m}-${day}`;

      if (date === yesterday) {
        return hour >= EDIT_DEADLINE_HOUR;
      }
      return true;
    }
    return false;
  };

  const days: DaySummary[] = [];

  for (const date of dates) {
    const status = isDateFinalized(date) ? "finalized" : "pending";

    const stepsResult =
      await deps.leaderboardRepository.getDailyStepsForChallenge(
        input.challengeId,
        date,
      );

    let pointsMap: Map<number, number> = new Map();
    if (status === "finalized") {
      const points = await deps.dailyPointsRepository.listForDate(
        input.challengeId,
        date,
      );
      for (const row of points) {
        pointsMap.set(row.user_id, row.points);
      }
    }

    const rankings: DayRanking[] = stepsResult.map((row, index) => {
      const isCurrentUser = row.user_id === input.userId;
      const showSteps = status === "finalized" || isCurrentUser;
      return {
        rank: index + 1,
        user_id: row.user_id,
        name: row.name,
        steps: showSteps ? row.steps || 0 : null,
        points: pointsMap.get(row.user_id) || 0,
        is_current_user: isCurrentUser,
      };
    });

    days.push({
      date,
      status,
      rankings,
    });
  }

  days.reverse();

  return ok({
    challenge_id: input.challengeId,
    challenge_title: challenge.title,
    mode: challenge.mode,
    days,
  });
}
