import type { Env } from "./types";
import { calculateDailyPoints, finalizeChallenges, activatePendingChallenges } from "./services/finalization";

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
  _ctx: import("@cloudflare/workers-types").ExecutionContext
): Promise<void> {
  console.log("[Scheduled] Running daily finalization");

  try {
    // 1. Activate any pending challenges that should now be active
    // (each challenge checked against its own timezone)
    await activatePendingChallenges(env);
    console.log("[Scheduled] Activated pending challenges");

    // 2. Calculate daily points for challenges past their edit deadline
    // (each challenge uses its own timezone to determine "yesterday")
    await calculateDailyPoints(env);
    console.log("[Scheduled] Calculated daily points");

    // 3. Finalize challenges that have ended (past edit deadline in their timezone)
    await finalizeChallenges(env);
    console.log("[Scheduled] Finalized completed challenges");

    console.log("[Scheduled] Daily finalization complete");
  } catch (error) {
    console.error("[Scheduled] Error during finalization:", error);
    throw error;
  }
}
