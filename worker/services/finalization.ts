import type { Env, Challenge } from "../types";
import { awardBadge, getChallengeParticipants, joinChallenge } from "../db/queries";
import { getDateTimeInTimezone, getYesterdayInTimezone, getDateInTimezone } from "../../shared/dateUtils";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";

interface DailyRanking {
  user_id: number;
  name: string;
  step_count: number;
}

/**
 * Calculate and store daily points for all active daily_winner challenges.
 * Called at noon UTC daily. For each challenge, we check if it's past noon
 * in the challenge's timezone before processing.
 */
export async function calculateDailyPoints(env: Env): Promise<void> {
  // Get all active daily_winner challenges
  const activeChallenges = await env.DB.prepare(
    `SELECT * FROM challenges
     WHERE mode = 'daily_winner'
     AND status = 'active'`
  )
    .all<Challenge>();

  for (const challenge of activeChallenges.results) {
    // Get the current time in the challenge's timezone
    const { hour } = getDateTimeInTimezone(challenge.timezone);
    const challengeYesterday = getYesterdayInTimezone(challenge.timezone);

    // Only process if it's past the edit deadline in this challenge's timezone
    if (hour >= EDIT_DEADLINE_HOUR) {
      // Check if yesterday was within the challenge period
      if (challengeYesterday >= challenge.start_date && challengeYesterday <= challenge.end_date) {
        await calculateDailyPointsForChallenge(env, challenge.id, challengeYesterday);
      }
    }
  }
}

async function calculateDailyPointsForChallenge(
  env: Env,
  challengeId: number,
  date: string
): Promise<void> {
  // Get rankings for yesterday
  const rankings = await env.DB.prepare(
    `SELECT cp.user_id, u.name, COALESCE(se.step_count, 0) as step_count
     FROM challenge_participants cp
     INNER JOIN users u ON cp.user_id = u.id
     LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
     WHERE cp.challenge_id = ?
     ORDER BY step_count DESC`
  )
    .bind(date, challengeId)
    .all<DailyRanking>();

  if (rankings.results.length === 0) return;

  // Award points: 1st = 3, 2nd = 2, 3rd = 1
  const pointsMap = [3, 2, 1];

  for (let i = 0; i < Math.min(3, rankings.results.length); i++) {
    const entry = rankings.results[i];
    // Only award points if they actually logged steps
    if (entry.step_count > 0) {
      const points = pointsMap[i];

      // Insert daily points
      await env.DB.prepare(
        `INSERT INTO daily_points (challenge_id, user_id, date, points)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(challenge_id, user_id, date) DO UPDATE SET points = excluded.points`
      )
        .bind(challengeId, entry.user_id, date, points)
        .run();

      // Award daily_winner badge to 1st place
      if (i === 0) {
        const badge = await awardBadge(env, entry.user_id, "daily_winner", challengeId);
        if (badge) {
          // Create notification for daily winner
          await createNotification(
            env,
            entry.user_id,
            "daily_win",
            "Daily Winner!",
            `You won the day with ${entry.step_count.toLocaleString()} steps!`,
            "daily_winner",
            challengeId
          );
        }
      }
    }
  }
}

/**
 * Finalize challenges that have ended in their respective timezones.
 * A challenge is finalized when: end_date < today (in challenge timezone) AND it's past noon.
 */
export async function finalizeChallenges(env: Env): Promise<void> {
  // Get all active challenges
  const activeChallenges = await env.DB.prepare(
    `SELECT * FROM challenges WHERE status = 'active'`
  )
    .all<Challenge>();

  for (const challenge of activeChallenges.results) {
    // Get the current time in the challenge's timezone
    const { date: challengeToday, hour } = getDateTimeInTimezone(challenge.timezone);

    // Only finalize if it's past the edit deadline and the challenge has ended
    // (end_date < today means the edit window for the last day has closed)
    if (hour >= EDIT_DEADLINE_HOUR && challenge.end_date < challengeToday) {
      await finalizeChallenge(env, challenge);
    }
  }
}

async function finalizeChallenge(env: Env, challenge: Challenge): Promise<void> {
  // Update status to completed
  await env.DB.prepare(
    `UPDATE challenges SET status = 'completed', updated_at = datetime('now') WHERE id = ?`
  )
    .bind(challenge.id)
    .run();

  // Calculate final winner based on mode
  let winner: { user_id: number; name: string; score: number } | null = null;

  if (challenge.mode === "cumulative") {
    // Winner is the one with most total steps in the challenge period
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
    // daily_winner mode: winner is the one with most total points
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
    const badge = await awardBadge(env, winner.user_id, "challenge_winner", challenge.id);
    if (badge) {
      const scoreLabel = challenge.mode === "cumulative" ? "steps" : "points";
      await createNotification(
        env,
        winner.user_id,
        "challenge_won",
        "Challenge Winner!",
        `You won "${challenge.title}" with ${winner.score.toLocaleString()} ${scoreLabel}!`,
        "challenge_winner",
        challenge.id
      );
    }
  }

  // If this is a recurring challenge, create the next one
  if (challenge.is_recurring && challenge.recurring_interval) {
    await createNextRecurringChallenge(env, challenge);
  }
}

/**
 * Activate pending challenges that should now be active.
 * Each challenge is activated based on its own timezone.
 */
export async function activatePendingChallenges(env: Env): Promise<void> {
  // Get all pending challenges
  const pendingChallenges = await env.DB.prepare(
    `SELECT * FROM challenges WHERE status = 'pending'`
  )
    .all<Challenge>();

  for (const challenge of pendingChallenges.results) {
    // Get today in the challenge's timezone
    const challengeToday = getDateInTimezone(challenge.timezone);

    // Activate if start_date has arrived in the challenge's timezone
    if (challenge.start_date <= challengeToday) {
      await env.DB.prepare(
        `UPDATE challenges
         SET status = 'active', updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(challenge.id)
        .run();
    }
  }
}

/**
 * Create a notification for a user.
 */
async function createNotification(
  env: Env,
  userId: number,
  type: string,
  title: string,
  message: string,
  badgeType: string | null,
  challengeId: number | null
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO pending_notifications (user_id, type, title, message, badge_type, challenge_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(userId, type, title, message, badgeType, challengeId)
    .run();
}

/**
 * Create the next recurring challenge after one completes.
 * Auto-enrolls all participants from the completed challenge.
 */
async function createNextRecurringChallenge(env: Env, challenge: Challenge): Promise<void> {
  // Calculate next dates based on recurring interval
  const { nextStart, nextEnd } = calculateNextDates(
    challenge.start_date,
    challenge.end_date,
    challenge.recurring_interval!
  );

  // Generate a new invite code
  const inviteCode = generateInviteCode();

  // Create the new challenge
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

  if (!result) {
    console.error(`[Recurring] Failed to create next challenge for ${challenge.id}`);
    return;
  }

  // Get all participants from the completed challenge and auto-enroll them
  const participants = await getChallengeParticipants(env, challenge.id);
  for (const participant of participants) {
    await joinChallenge(env, result.id, participant.user_id);
  }

  console.log(`[Recurring] Created next challenge ${result.id} from ${challenge.id} with ${participants.length} participants`);
}

/**
 * Calculate the next start and end dates for a recurring challenge.
 */
function calculateNextDates(
  startDate: string,
  endDate: string,
  interval: "weekly" | "monthly"
): { nextStart: string; nextEnd: string } {
  // Parse the dates
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  // Calculate duration in days
  const durationMs = end.getTime() - start.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24));

  // Calculate next start based on interval
  let nextStart: Date;
  if (interval === "weekly") {
    // Next challenge starts 7 days after the original start
    nextStart = new Date(start);
    nextStart.setDate(nextStart.getDate() + 7);
  } else {
    // Monthly: next challenge starts 1 month after the original start
    nextStart = new Date(start);
    nextStart.setMonth(nextStart.getMonth() + 1);
  }

  // Next end is same duration after next start
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
