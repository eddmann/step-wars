import type { Env } from "./types";
import { createD1ChallengeRepository } from "./repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "./repositories/d1/participant.d1";
import { createD1DailyPointsRepository } from "./repositories/d1/daily-points.d1";
import { createD1LeaderboardRepository } from "./repositories/d1/leaderboard.d1";
import { createD1BadgeRepository } from "./repositories/d1/badge.d1";
import { createD1NotificationRepository } from "./repositories/d1/notification.d1";
import { runCron } from "./usecases/run-cron.usecase";

/**
 * Scheduled handler for the cron job.
 * Runs at noon UTC daily (0 12 * * *).
 *
 * Each challenge is processed according to its own timezone:
 * - Challenges where it's past noon are processed
 * - Daily points are calculated for each challenge's "yesterday"
 * - Challenges are finalized when their end_date has passed
 */
export async function handleScheduled(
  _controller: import("@cloudflare/workers-types").ScheduledController,
  env: Env,
  _ctx: import("@cloudflare/workers-types").ExecutionContext,
): Promise<void> {
  void _controller;
  void _ctx;

  try {
    const deps = {
      challengeRepository: createD1ChallengeRepository(env),
      participantRepository: createD1ParticipantRepository(env),
      dailyPointsRepository: createD1DailyPointsRepository(env),
      leaderboardRepository: createD1LeaderboardRepository(env),
      badgeRepository: createD1BadgeRepository(env),
      notificationRepository: createD1NotificationRepository(env),
    };

    await runCron(deps);
  } catch (error) {
    console.error("[Scheduled] Error during finalization:", error);
    throw error;
  }
}
