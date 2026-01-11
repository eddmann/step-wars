import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import { getChallengeById, isParticipant, getChallengeLeaderboard } from "../db/queries";
import { EDIT_DEADLINE_HOUR } from "../../shared/constants";
import { getDateTimeInTimezone, getYesterdayInTimezone } from "../../shared/dateUtils";

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

export async function handleLeaderboard(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // Match /api/challenges/:id/leaderboard
  const match = path.match(/^\/api\/challenges\/(\d+)\/leaderboard$/);
  if (!match) {
    return errorResponse("Not found", 404);
  }

  const challengeId = parseInt(match[1], 10);

  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }

  // Verify challenge exists and user is participant
  const challenge = await getChallengeById(env, challengeId);
  if (!challenge) {
    return errorResponse("Challenge not found", 404);
  }

  const participant = await isParticipant(env, challengeId, user.id);
  if (!participant) {
    return errorResponse("Not a participant in this challenge", 403);
  }

  // Get today's date and edit cutoff in challenge's timezone
  // This ensures all participants see the same day boundaries for fairness
  const { date: today, hour } = getDateTimeInTimezone(challenge.timezone);
  const editCutoffDate = getEditCutoffDate(today, hour, challenge.timezone);

  const rawLeaderboard = await getChallengeLeaderboard(
    env,
    challengeId,
    challenge.start_date,
    challenge.end_date,
    today,
    editCutoffDate
  );

  // Build leaderboard with visibility rules:
  // - confirmed_steps: visible to everyone (before edit cutoff)
  // - pending_steps + today_steps: only visible to the user themselves
  const leaderboard = rawLeaderboard.map((entry, index) => {
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
      // Only show today's steps to the user themselves
      today_steps: isCurrentUser ? entry.today_steps : null,
      is_current_user: isCurrentUser,
      // Let the frontend know there are hidden pending steps
      has_pending_steps: !isCurrentUser && entry.pending_steps > 0,
    };
  });

  return jsonResponse({
    data: {
      challenge_id: challengeId,
      mode: challenge.mode,
      leaderboard,
      // Include cutoff info so frontend can display appropriately
      edit_cutoff_date: editCutoffDate,
    },
  });
}
