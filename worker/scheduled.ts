import type { Env } from "./types";
import { calculateDailyPoints, finalizeChallenges, activatePendingChallenges } from "./services/finalization";

/**
 * Scheduled handler for the cron job.
 * Runs at noon UTC daily (0 12 * * *).
 *
 * At this point:
 * - Yesterday's edit window has closed (noon today = deadline for yesterday)
 * - We can safely calculate daily points for yesterday
 * - We can finalize challenges that ended before yesterday
 */
export async function handleScheduled(
  _controller: import("@cloudflare/workers-types").ScheduledController,
  env: Env,
  _ctx: import("@cloudflare/workers-types").ExecutionContext
): Promise<void> {
  // Use UTC for the cron job - the finalization is date-based
  // and we process all challenges regardless of user timezone
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Yesterday (the day whose edit window just closed)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  console.log(`[Scheduled] Running daily finalization for ${yesterdayStr}`);

  try {
    // 1. Activate any pending challenges that should now be active
    await activatePendingChallenges(env, today);
    console.log("[Scheduled] Activated pending challenges");

    // 2. Calculate daily points for yesterday (for daily_winner challenges)
    await calculateDailyPoints(env, yesterdayStr);
    console.log("[Scheduled] Calculated daily points");

    // 3. Finalize challenges that ended before yesterday
    await finalizeChallenges(env, yesterdayStr);
    console.log("[Scheduled] Finalized completed challenges");

    console.log("[Scheduled] Daily finalization complete");
  } catch (error) {
    console.error("[Scheduled] Error during finalization:", error);
    throw error;
  }
}
