import type { Challenge } from "../types";
import {
  EDIT_DEADLINE_HOUR,
  generateInviteCode,
  parseDate,
  formatDate,
} from "../../shared/constants";
import {
  getDateTimeInTimezone,
  getYesterdayInTimezone,
  getDateInTimezone,
} from "../../shared/dateUtils";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";
import type { ChallengeRepository } from "../repositories/interfaces/challenge.repository";
import type { ParticipantRepository } from "../repositories/interfaces/participant.repository";
import type { DailyPointsRepository } from "../repositories/interfaces/daily-points.repository";
import type { LeaderboardRepository } from "../repositories/interfaces/leaderboard.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import type { NotificationRepository } from "../repositories/interfaces/notification.repository";
import { createNotification } from "./notifications.service";

interface DailyRanking {
  user_id: number;
  name: string;
  step_count: number;
}

export interface ChallengeLifecycleDeps {
  challengeRepository: ChallengeRepository;
  participantRepository: ParticipantRepository;
  dailyPointsRepository: DailyPointsRepository;
  leaderboardRepository: LeaderboardRepository;
  badgeRepository: BadgeRepository;
  notificationRepository: NotificationRepository;
  clock?: Clock;
}

/**
 * Activate pending challenges that should now be active.
 * Each challenge is activated based on its own timezone.
 */
export async function activatePendingChallenges(
  deps: ChallengeLifecycleDeps,
): Promise<void> {
  const now = (deps.clock ?? systemClock).now();
  const pendingChallenges =
    await deps.challengeRepository.listByStatus("pending");

  for (const challenge of pendingChallenges) {
    const challengeToday = getDateInTimezone(challenge.timezone, now);

    if (challenge.start_date <= challengeToday) {
      await deps.challengeRepository.updateStatus(challenge.id, "active");
    }
  }
}

/**
 * Calculate and store daily points for all active daily_winner challenges.
 */
export async function calculateDailyPoints(
  deps: ChallengeLifecycleDeps,
): Promise<void> {
  const now = (deps.clock ?? systemClock).now();
  const activeChallenges =
    await deps.challengeRepository.listActiveByMode("daily_winner");

  for (const challenge of activeChallenges) {
    const { hour } = getDateTimeInTimezone(challenge.timezone, now);
    const challengeYesterday = getYesterdayInTimezone(challenge.timezone, now);

    if (hour >= EDIT_DEADLINE_HOUR) {
      if (
        challengeYesterday >= challenge.start_date &&
        challengeYesterday <= challenge.end_date
      ) {
        await calculateDailyPointsForChallengeDate(
          deps,
          challenge.id,
          challengeYesterday,
        );
      }
    }
  }
}

export async function calculateDailyPointsForChallengeDate(
  deps: ChallengeLifecycleDeps,
  challengeId: number,
  date: string,
): Promise<void> {
  const steps = await deps.leaderboardRepository.getDailyStepsForChallenge(
    challengeId,
    date,
  );
  if (steps.length === 0) return;

  const rankings: DailyRanking[] = steps.map((row) => ({
    user_id: row.user_id,
    name: row.name,
    step_count: row.steps ?? 0,
  }));

  const pointsMap = [3, 2, 1];

  for (let i = 0; i < Math.min(3, rankings.length); i++) {
    const entry = rankings[i];
    if (entry.step_count > 0) {
      const points = pointsMap[i];

      await deps.dailyPointsRepository.upsert(
        challengeId,
        entry.user_id,
        date,
        points,
      );

      if (i === 0) {
        const badge = await deps.badgeRepository.award(
          entry.user_id,
          "daily_winner",
        );
        if (badge) {
          await createNotification(
            { notificationRepository: deps.notificationRepository },
            entry.user_id,
            "daily_win",
            "Daily Winner!",
            `You won the day with ${entry.step_count.toLocaleString()} steps!`,
            "daily_winner",
            challengeId,
          );
        }
      }
    }
  }
}

/**
 * Finalize challenges that have ended in their respective timezones.
 */
export async function finalizeChallenges(
  deps: ChallengeLifecycleDeps,
): Promise<void> {
  const now = (deps.clock ?? systemClock).now();
  const activeChallenges =
    await deps.challengeRepository.listByStatus("active");

  for (const challenge of activeChallenges) {
    const { date: challengeToday, hour } = getDateTimeInTimezone(
      challenge.timezone,
      now,
    );

    if (hour >= EDIT_DEADLINE_HOUR && challenge.end_date < challengeToday) {
      await finalizeChallenge(deps, challenge);
    }
  }
}

export async function finalizeChallenge(
  deps: ChallengeLifecycleDeps,
  challenge: Challenge,
): Promise<void> {
  await deps.challengeRepository.updateStatus(challenge.id, "completed");

  let winner: { user_id: number; name: string; score: number } | null = null;

  if (challenge.mode === "cumulative") {
    const result = await deps.leaderboardRepository.getCumulativeWinner(
      challenge.id,
      challenge.start_date,
      challenge.end_date,
    );

    if (result && result.score > 0) {
      winner = result;
    }
  } else {
    const result = await deps.leaderboardRepository.getPointsWinner(
      challenge.id,
    );
    if (result && result.score > 0) {
      winner = result;
    }
  }

  if (winner) {
    const badge = await deps.badgeRepository.award(
      winner.user_id,
      "challenge_winner",
    );
    if (badge) {
      const scoreLabel = challenge.mode === "cumulative" ? "steps" : "points";
      await createNotification(
        { notificationRepository: deps.notificationRepository },
        winner.user_id,
        "challenge_won",
        "Challenge Winner!",
        `You won "${challenge.title}" with ${winner.score.toLocaleString()} ${scoreLabel}!`,
        "challenge_winner",
        challenge.id,
      );
    }
  }

  if (challenge.is_recurring && challenge.recurring_interval) {
    await createNextRecurringChallenge(deps, challenge);
  }
}

export async function createNextRecurringChallenge(
  deps: ChallengeLifecycleDeps,
  challenge: Challenge,
): Promise<void> {
  const { nextStart, nextEnd } = calculateNextDates(
    challenge.start_date,
    challenge.end_date,
    challenge.recurring_interval!,
  );

  const inviteCode = generateInviteCode();

  const nextChallenge = await deps.challengeRepository.create({
    title: challenge.title,
    description: challenge.description,
    creatorId: challenge.creator_id,
    startDate: nextStart,
    endDate: nextEnd,
    mode: challenge.mode,
    inviteCode,
    timezone: challenge.timezone,
    isRecurring: true,
    recurringInterval: challenge.recurring_interval,
    status: "pending",
  });

  const participants = await deps.participantRepository.listParticipants(
    challenge.id,
  );
  for (const participant of participants) {
    await deps.participantRepository.join(
      nextChallenge.id,
      participant.user_id,
    );
  }
}

function calculateNextDates(
  startDate: string,
  endDate: string,
  interval: "weekly" | "monthly",
): { nextStart: string; nextEnd: string } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  let nextStart: Date;
  if (interval === "weekly") {
    nextStart = new Date(start);
    nextStart.setDate(nextStart.getDate() + 7);
  } else {
    nextStart = new Date(start);
    nextStart.setMonth(nextStart.getMonth() + 1);
  }

  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + durationDays);

  return {
    nextStart: formatDate(nextStart),
    nextEnd: formatDate(nextEnd),
  };
}
