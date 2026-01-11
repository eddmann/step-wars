/**
 * Test-only endpoints for integration testing.
 * These endpoints bypass normal validation to allow testing scenarios
 * that would otherwise be impossible (e.g., inserting historical step data).
 *
 * IMPORTANT: These endpoints should only work in development mode.
 */

import type { Env, User, Challenge } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import { upsertStepEntry, awardBadge, getChallengeParticipants, joinChallenge } from "../db/queries";

export async function handleTestRoutes(
  request: Request,
  env: Env,
  user: User | null,
  path: string
): Promise<Response> {
  // Only allow test routes in development environment
  if (env.ENVIRONMENT !== "development") {
    return errorResponse("Not found", 404);
  }

  // POST /api/__test__/steps - Insert step entries bypassing edit window
  if (path === "/api/__test__/steps" && request.method === "POST") {
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = (await request.json()) as {
      date: string;
      step_count: number;
      source?: string;
    };

    if (!body.date || body.step_count === undefined) {
      return errorResponse("Date and step_count are required");
    }

    // Bypass edit window validation - insert directly
    // Note: source must be one of: manual, healthkit, google_fit, garmin, strava
    const entry = await upsertStepEntry(
      env,
      user.id,
      body.date,
      body.step_count,
      body.source || "manual"
    );

    return jsonResponse({ data: { entry } });
  }

  // POST /api/__test__/run-cron - Manually trigger the scheduled handler
  // This version FORCES processing regardless of timezone/time checks
  if (path === "/api/__test__/run-cron" && request.method === "POST") {
    try {
      // 1. Force-activate all pending challenges
      await forceActivatePendingChallenges(env);

      // 2. Force-calculate daily points for all active challenges
      const body = (await request.json().catch(() => ({}))) as {
        dates?: string[];
      };
      await forceCalculateDailyPoints(env, body.dates);

      // 3. Force-finalize challenges that have ended
      await forceFinalizeChallenges(env);

      return jsonResponse({
        data: { success: true, message: "Cron job executed successfully (forced)" },
      });
    } catch (error) {
      console.error("[Test] Error running cron:", error);
      return errorResponse(
        `Cron execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        500
      );
    }
  }

  return errorResponse("Not found", 404);
}

/**
 * Force-activate all pending challenges (bypasses timezone checks)
 */
async function forceActivatePendingChallenges(env: Env): Promise<void> {
  await env.DB.prepare(
    `UPDATE challenges SET status = 'active', updated_at = datetime('now')
     WHERE status = 'pending'`
  ).run();
}

/**
 * Force-calculate daily points for specified dates (bypasses timezone checks)
 */
async function forceCalculateDailyPoints(env: Env, dates?: string[]): Promise<void> {
  const activeChallenges = await env.DB.prepare(
    `SELECT * FROM challenges WHERE mode = 'daily_winner' AND status = 'active'`
  ).all<Challenge>();

  for (const challenge of activeChallenges.results) {
    // If no dates specified, calculate for all dates in the challenge period
    const datesToProcess = dates || await getChallengeDates(env, challenge);

    for (const date of datesToProcess) {
      // Only process dates within the challenge period
      if (date >= challenge.start_date && date <= challenge.end_date) {
        await calculateDailyPointsForDate(env, challenge.id, date);
      }
    }
  }
}

async function getChallengeDates(env: Env, challenge: Challenge): Promise<string[]> {
  // Get all distinct dates with step entries for this challenge's participants
  const result = await env.DB.prepare(
    `SELECT DISTINCT se.date
     FROM step_entries se
     INNER JOIN challenge_participants cp ON cp.user_id = se.user_id
     WHERE cp.challenge_id = ?
       AND se.date >= ?
       AND se.date <= ?
     ORDER BY se.date`
  )
    .bind(challenge.id, challenge.start_date, challenge.end_date)
    .all<{ date: string }>();

  return result.results.map((r) => r.date);
}

async function calculateDailyPointsForDate(
  env: Env,
  challengeId: number,
  date: string
): Promise<void> {
  // Check if already processed
  const existing = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM daily_points WHERE challenge_id = ? AND date = ?`
  )
    .bind(challengeId, date)
    .first<{ count: number }>();

  if (existing && existing.count > 0) {
    return; // Already processed this date
  }

  // Get rankings for this date
  const rankings = await env.DB.prepare(
    `SELECT cp.user_id, u.name, COALESCE(se.step_count, 0) as step_count
     FROM challenge_participants cp
     INNER JOIN users u ON cp.user_id = u.id
     LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
     WHERE cp.challenge_id = ?
     ORDER BY step_count DESC`
  )
    .bind(date, challengeId)
    .all<{ user_id: number; name: string; step_count: number }>();

  if (rankings.results.length === 0) return;

  const pointsMap = [3, 2, 1];

  for (let i = 0; i < Math.min(3, rankings.results.length); i++) {
    const entry = rankings.results[i];
    if (entry.step_count > 0) {
      const points = pointsMap[i];

      await env.DB.prepare(
        `INSERT INTO daily_points (challenge_id, user_id, date, points)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(challenge_id, user_id, date) DO UPDATE SET points = excluded.points`
      )
        .bind(challengeId, entry.user_id, date, points)
        .run();

      // Award daily_winner badge to 1st place
      if (i === 0) {
        await awardBadge(env, entry.user_id, "daily_winner", challengeId);
      }
    }
  }
}

/**
 * Force-finalize all challenges that have ended (bypasses timezone checks)
 */
async function forceFinalizeChallenges(env: Env): Promise<void> {
  const activeChallenges = await env.DB.prepare(
    `SELECT * FROM challenges WHERE status = 'active'`
  ).all<Challenge>();

  const today = new Date().toISOString().split("T")[0];

  for (const challenge of activeChallenges.results) {
    // Finalize if end_date is in the past
    if (challenge.end_date < today) {
      await forceFinalize(env, challenge);
    }
  }
}

async function forceFinalize(env: Env, challenge: Challenge): Promise<void> {
  // Update status to completed
  await env.DB.prepare(
    `UPDATE challenges SET status = 'completed', updated_at = datetime('now') WHERE id = ?`
  )
    .bind(challenge.id)
    .run();

  // Calculate final winner based on mode
  let winner: { user_id: number; name: string; score: number } | null = null;

  if (challenge.mode === "cumulative") {
    const result = await env.DB.prepare(
      `SELECT cp.user_id, u.name, COALESCE(SUM(se.step_count), 0) as score
       FROM challenge_participants cp
       INNER JOIN users u ON cp.user_id = u.id
       LEFT JOIN step_entries se ON se.user_id = cp.user_id
         AND se.date >= ? AND se.date <= ?
       WHERE cp.challenge_id = ?
       GROUP BY cp.user_id, u.name
       ORDER BY score DESC
       LIMIT 1`
    )
      .bind(challenge.start_date, challenge.end_date, challenge.id)
      .first<{ user_id: number; name: string; score: number }>();

    if (result && result.score > 0) {
      winner = result;
    }
  } else {
    const result = await env.DB.prepare(
      `SELECT cp.user_id, u.name, COALESCE(SUM(dp.points), 0) as score
       FROM challenge_participants cp
       INNER JOIN users u ON cp.user_id = u.id
       LEFT JOIN daily_points dp ON dp.user_id = cp.user_id AND dp.challenge_id = ?
       WHERE cp.challenge_id = ?
       GROUP BY cp.user_id, u.name
       ORDER BY score DESC
       LIMIT 1`
    )
      .bind(challenge.id, challenge.id)
      .first<{ user_id: number; name: string; score: number }>();

    if (result && result.score > 0) {
      winner = result;
    }
  }

  // Award challenge_winner badge
  if (winner) {
    await awardBadge(env, winner.user_id, "challenge_winner", challenge.id);
  }

  // If this is a recurring challenge, create the next one
  if (challenge.is_recurring && challenge.recurring_interval) {
    await createNextRecurringChallenge(env, challenge);
  }
}

/**
 * Create the next recurring challenge (test version)
 */
async function createNextRecurringChallenge(env: Env, challenge: Challenge): Promise<void> {
  const { nextStart, nextEnd } = calculateNextDates(
    challenge.start_date,
    challenge.end_date,
    challenge.recurring_interval!
  );

  const inviteCode = generateInviteCode();

  const result = await env.DB.prepare(
    `INSERT INTO challenges (title, description, creator_id, start_date, end_date, mode, invite_code, timezone, is_recurring, recurring_interval, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'pending')
     RETURNING *`
  )
    .bind(
      challenge.title,
      challenge.description,
      challenge.creator_id,
      nextStart,
      nextEnd,
      challenge.mode,
      inviteCode,
      challenge.timezone,
      challenge.recurring_interval
    )
    .first<Challenge>();

  if (!result) return;

  const participants = await getChallengeParticipants(env, challenge.id);
  for (const participant of participants) {
    await joinChallenge(env, result.id, participant.user_id);
  }
}

function calculateNextDates(
  startDate: string,
  endDate: string,
  interval: "weekly" | "monthly"
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

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}
