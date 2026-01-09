import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import {
  createChallenge,
  getChallengeById,
  getChallengeByInviteCode,
  getUserChallenges,
  joinChallenge,
  isParticipant,
  getChallengeParticipants,
} from "../db/queries";

export async function handleChallenges(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // GET /api/challenges - List user's challenges
  if (path === "/api/challenges" && request.method === "GET") {
    const challenges = await getUserChallenges(env, user.id);
    return jsonResponse({ data: { challenges } });
  }

  // POST /api/challenges - Create a new challenge
  if (path === "/api/challenges" && request.method === "POST") {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      mode: "daily_winner" | "cumulative";
      is_recurring?: boolean;
      recurring_interval?: "weekly" | "monthly";
    };

    if (!body.title || !body.start_date || !body.end_date || !body.mode) {
      return errorResponse("Title, start_date, end_date, and mode are required");
    }

    if (body.mode !== "daily_winner" && body.mode !== "cumulative") {
      return errorResponse("Mode must be 'daily_winner' or 'cumulative'");
    }

    if (new Date(body.start_date) > new Date(body.end_date)) {
      return errorResponse("Start date must be before end date");
    }

    const challenge = await createChallenge(
      env,
      user.id,
      body.title,
      body.description || null,
      body.start_date,
      body.end_date,
      body.mode,
      body.is_recurring || false,
      body.recurring_interval || null
    );

    return jsonResponse({ data: { challenge } }, 201);
  }

  // POST /api/challenges/join - Join a challenge with invite code
  if (path === "/api/challenges/join" && request.method === "POST") {
    const body = (await request.json()) as { invite_code: string };

    if (!body.invite_code) {
      return errorResponse("Invite code is required");
    }

    const challenge = await getChallengeByInviteCode(env, body.invite_code);
    if (!challenge) {
      return errorResponse("Invalid invite code", 404);
    }

    const alreadyJoined = await isParticipant(env, challenge.id, user.id);
    if (alreadyJoined) {
      return errorResponse("Already a participant in this challenge");
    }

    await joinChallenge(env, challenge.id, user.id);

    return jsonResponse({ data: { challenge } });
  }

  // GET /api/challenges/:id - Get challenge details
  const challengeMatch = path.match(/^\/api\/challenges\/(\d+)$/);
  if (challengeMatch && request.method === "GET") {
    const challengeId = parseInt(challengeMatch[1], 10);

    const challenge = await getChallengeById(env, challengeId);
    if (!challenge) {
      return errorResponse("Challenge not found", 404);
    }

    // Check if user is a participant
    const participant = await isParticipant(env, challengeId, user.id);
    if (!participant) {
      return errorResponse("Not a participant in this challenge", 403);
    }

    const participants = await getChallengeParticipants(env, challengeId);

    return jsonResponse({
      data: {
        challenge: {
          ...challenge,
          is_recurring: Boolean(challenge.is_recurring),
        },
        participants,
        participant_count: participants.length,
      },
    });
  }

  return errorResponse("Not found", 404);
}
