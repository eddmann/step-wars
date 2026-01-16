import type { Context } from "hono";
import type { AppBindings } from "../types";
import { getChallengeById, isParticipant } from "../db/queries";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";
import { getDateTimeInTimezone } from "../../shared/dateUtils";

interface DayRanking {
  rank: number;
  user_id: number;
  name: string;
  steps: number | null; // null for other users on pending days
  points: number;
  is_current_user: boolean;
}

interface DaySummary {
  date: string;
  status: "finalized" | "pending";
  rankings: DayRanking[];
}

// Helper to generate all dates between start and end (inclusive)
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// GET /api/challenges/:id/daily-breakdown
export async function handleDailyBreakdown(c: Context<AppBindings>) {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);

  // Verify challenge exists and user is participant
  const challenge = await getChallengeById(c.env, challengeId);
  if (!challenge) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  const participant = await isParticipant(c.env, challengeId, user.id);
  if (!participant) {
    return c.json({ error: "Not a participant in this challenge" }, 403);
  }

  // Get current date/time in challenge timezone
  const { date: today, hour } = getDateTimeInTimezone(challenge.timezone);

  // Determine which dates to show (start to min(end, today))
  const effectiveEndDate = challenge.end_date < today ? challenge.end_date : today;

  // If challenge hasn't started yet
  if (challenge.start_date > today) {
    return c.json({
      data: {
        challenge_id: challengeId,
        challenge_title: challenge.title,
        mode: challenge.mode,
        days: [],
      },
    });
  }

  const dates = getDateRange(challenge.start_date, effectiveEndDate);

  // Dates that are finalized (edit window has closed)
  // A date is finalized if:
  // - It's before today, AND
  // - If it's yesterday, current hour >= EDIT_DEADLINE_HOUR
  const isDateFinalized = (date: string): boolean => {
    if (date < today) {
      // Calculate yesterday in challenge timezone
      const d = new Date(today + "T00:00:00");
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const yesterday = `${y}-${m}-${day}`;

      if (date === yesterday) {
        // Yesterday is only finalized if we're past noon
        return hour >= EDIT_DEADLINE_HOUR;
      }
      // Anything before yesterday is definitely finalized
      return true;
    }
    return false;
  };

  // Build days array
  const days: DaySummary[] = [];

  for (const date of dates) {
    const status = isDateFinalized(date) ? "finalized" : "pending";

    // Get step entries for all participants on this date
    const stepsResult = await c.env.DB.prepare(
      `SELECT se.user_id, u.name, COALESCE(se.step_count, 0) as steps
       FROM challenge_participants cp
       INNER JOIN users u ON cp.user_id = u.id
       LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
       WHERE cp.challenge_id = ?
       ORDER BY steps DESC`
    )
      .bind(date, challengeId)
      .all<{ user_id: number; name: string; steps: number }>();

    // Get daily points for this date (if finalized)
    let pointsMap: Map<number, number> = new Map();
    if (status === "finalized") {
      const pointsResult = await c.env.DB.prepare(
        `SELECT user_id, points FROM daily_points
         WHERE challenge_id = ? AND date = ?`
      )
        .bind(challengeId, date)
        .all<{ user_id: number; points: number }>();

      for (const row of pointsResult.results) {
        pointsMap.set(row.user_id, row.points);
      }
    }

    // Build rankings
    // For pending days, hide other users' steps (only show current user's)
    const rankings: DayRanking[] = stepsResult.results.map((row, index) => {
      const isCurrentUser = row.user_id === user.id;
      const showSteps = status === "finalized" || isCurrentUser;
      return {
        rank: index + 1,
        user_id: row.user_id,
        name: row.name,
        steps: showSteps ? (row.steps || 0) : null,
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

  // Return most recent first
  days.reverse();

  return c.json({
    data: {
      challenge_id: challengeId,
      challenge_title: challenge.title,
      mode: challenge.mode,
      days,
    },
  });
}

export default handleDailyBreakdown;
