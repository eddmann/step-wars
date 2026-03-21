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
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
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
  goalsRepository?: GoalsRepository;
  stepEntryRepository?: StepEntryRepository;
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

        // Comeback Kid: win a daily round after finishing last the previous day
        const lastPlace = rankings[rankings.length - 1];
        if (rankings.length >= 2 && lastPlace) {
          // Check if yesterday's last-place finisher is today's winner
          const previousDate = getPreviousDateStr(date);
          const prevSteps =
            await deps.leaderboardRepository.getDailyStepsForChallenge(
              challengeId,
              previousDate,
            );
          if (prevSteps.length >= 2) {
            const prevLastPlace = prevSteps[prevSteps.length - 1];
            if (prevLastPlace.user_id === entry.user_id) {
              await deps.badgeRepository.award(entry.user_id, "comeback_kid");
            }
          }
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

  await deps.challengeRepository.complete(
    challenge.id,
    winner?.user_id ?? null,
  );

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

  // Iron Walker: hit daily goal every day of a challenge
  await checkIronWalker(deps, challenge);

  // Rival: complete 3+ challenges with the same opponent
  await checkRival(deps, challenge);

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

function getPreviousDateStr(dateStr: string): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - 1);
  return formatDate(d);
}

/**
 * Iron Walker: award badge to any participant who hit their daily goal
 * every single day of a completed challenge.
 */
async function checkIronWalker(
  deps: ChallengeLifecycleDeps,
  challenge: Challenge,
): Promise<void> {
  if (!deps.goalsRepository || !deps.stepEntryRepository) return;

  const participants = await deps.participantRepository.listParticipants(
    challenge.id,
  );

  const start = parseDate(challenge.start_date);
  const end = parseDate(challenge.end_date);
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (const participant of participants) {
    const goals = await deps.goalsRepository.getOrCreate(participant.user_id);
    const entries = await deps.stepEntryRepository.listRecentForUser(
      participant.user_id,
      totalDays + 10,
    );
    const stepsByDate = new Map<string, number>();
    for (const entry of entries) {
      stepsByDate.set(entry.date, entry.step_count);
    }

    let perfect = true;
    const current = new Date(start);
    while (current <= end) {
      const dateStr = formatDate(current);
      const steps = stepsByDate.get(dateStr) || 0;
      if (steps < goals.daily_target) {
        perfect = false;
        break;
      }
      current.setDate(current.getDate() + 1);
    }

    if (perfect) {
      await deps.badgeRepository.award(participant.user_id, "iron_walker");
    }
  }
}

/**
 * Rival: award badge when a user has completed 3+ challenges
 * with the same opponent.
 */
async function checkRival(
  deps: ChallengeLifecycleDeps,
  challenge: Challenge,
): Promise<void> {
  const participants = await deps.participantRepository.listParticipants(
    challenge.id,
  );
  if (participants.length < 2) return;

  for (const participant of participants) {
    const userChallenges = await deps.challengeRepository.listForUser(
      participant.user_id,
    );
    const completedChallenges = userChallenges.filter(
      (c) => c.status === "completed",
    );

    // Count how many completed challenges each opponent shares
    const opponentCounts = new Map<number, number>();
    for (const c of completedChallenges) {
      const cParticipants = await deps.participantRepository.listParticipants(
        c.id,
      );
      for (const p of cParticipants) {
        if (p.user_id !== participant.user_id) {
          opponentCounts.set(
            p.user_id,
            (opponentCounts.get(p.user_id) || 0) + 1,
          );
        }
      }
    }

    for (const count of opponentCounts.values()) {
      if (count >= 3) {
        await deps.badgeRepository.award(participant.user_id, "rival");
        break;
      }
    }
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
