import type { Context } from "hono";
import type { AppBindings } from "../types";
import { getChallengeById, isParticipant, getChallengeLeaderboard } from "../db/queries";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";
import { getDateTimeInTimezone, getYesterdayInTimezone } from "../../shared/dateUtils";

// Get the last finalized date (the day before the edit cutoff)
function getLastFinalizedDate(editCutoffDate: string): string {
  const d = new Date(editCutoffDate + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Calculate the edit cutoff date - entries on or after this date are still editable
// If it's before noon, yesterday is still editable, so cutoff is yesterday
// If it's noon or after, only today is editable, so cutoff is today
function getEditCutoffDate(date: string, hour: number, timezone: string): string {
  if (hour < EDIT_DEADLINE_HOUR) {
    // Before noon: yesterday is still editable
    return getYesterdayInTimezone(timezone);
  } else {
    // Noon or after: only today is editable
    return date;
  }
}

// GET /api/challenges/:id/leaderboard
export async function handleLeaderboard(c: Context<AppBindings>) {
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

  // Get today's date and edit cutoff in challenge's timezone
  // This ensures all participants see the same day boundaries for fairness
  const { date: today, hour } = getDateTimeInTimezone(challenge.timezone);
  const editCutoffDate = getEditCutoffDate(today, hour, challenge.timezone);

  const rawLeaderboard = await getChallengeLeaderboard(
    c.env,
    challengeId,
    challenge.start_date,
    challenge.end_date,
    today,
    editCutoffDate
  );

  // Get the last finalized date and fetch steps for that date
  const lastFinalizedDate = getLastFinalizedDate(editCutoffDate);

  // Query last finalized day steps for all participants
  const lastFinalizedStepsResult = await c.env.DB.prepare(
    `SELECT cp.user_id, COALESCE(se.step_count, 0) as steps
     FROM challenge_participants cp
     LEFT JOIN step_entries se ON se.user_id = cp.user_id AND se.date = ?
     WHERE cp.challenge_id = ?`
  )
    .bind(lastFinalizedDate, challengeId)
    .all<{ user_id: number; steps: number }>();

  const lastFinalizedStepsMap = new Map<number, number>();
  for (const row of lastFinalizedStepsResult.results) {
    lastFinalizedStepsMap.set(row.user_id, row.steps);
  }

  // Sort by the appropriate metric based on challenge mode
  const sortedLeaderboard = [...rawLeaderboard].sort((a, b) => {
    if (challenge.mode === "daily_winner") {
      // Sort by total points for daily_winner mode
      return b.total_points - a.total_points;
    }
    // Sort by confirmed steps for cumulative mode
    return b.confirmed_steps - a.confirmed_steps;
  });

  // Build leaderboard with visibility rules:
  // - confirmed_steps: visible to everyone (before edit cutoff)
  // - pending_steps + today_steps: only visible to the user themselves
  const leaderboard = sortedLeaderboard.map((entry, index) => {
    const isCurrentUser = entry.user_id === user.id;

    return {
      rank: index + 1,
      user_id: entry.user_id,
      name: entry.name,
      // For other users, only show confirmed steps
      // For current user, show confirmed + pending (their full total)
      total_steps: isCurrentUser
        ? entry.confirmed_steps + entry.pending_steps
        : entry.confirmed_steps,
      total_points: entry.total_points,
      is_current_user: isCurrentUser,
      // Last finalized day steps (visible to all)
      last_finalized_steps: lastFinalizedStepsMap.get(entry.user_id) || 0,
    };
  });

  return c.json({
    data: {
      challenge_id: challengeId,
      mode: challenge.mode,
      leaderboard,
      // Include date info so frontend can display appropriately
      edit_cutoff_date: editCutoffDate,
      last_finalized_date: lastFinalizedDate,
    },
  });
}

export default handleLeaderboard;
