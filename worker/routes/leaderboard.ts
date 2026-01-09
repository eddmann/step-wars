import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import { getChallengeById, isParticipant, getChallengeLeaderboard } from "../db/queries";

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

  // Get today's date in user's timezone
  const now = new Date();
  const userNow = new Date(
    now.toLocaleString("en-US", { timeZone: user.timezone })
  );
  const today = userNow.toISOString().split("T")[0];

  const rawLeaderboard = await getChallengeLeaderboard(env, challengeId, today);

  // Add rank and current user flag
  const leaderboard = rawLeaderboard.map((entry, index) => ({
    rank: index + 1,
    user_id: entry.user_id,
    name: entry.name,
    total_steps: entry.total_steps,
    total_points: entry.total_points,
    today_steps: entry.today_steps,
    is_current_user: entry.user_id === user.id,
  }));

  return jsonResponse({
    data: {
      challenge_id: challengeId,
      mode: challenge.mode,
      leaderboard,
    },
  });
}
