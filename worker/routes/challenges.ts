import { Hono } from "hono";
import type { AppBindings } from "../types";
import {
  createChallenge,
  getChallengeById,
  getChallengeByInviteCode,
  getUserChallenges,
  joinChallenge,
  isParticipant,
  getChallengeParticipants,
} from "../db/queries";

const challenges = new Hono<AppBindings>();

// GET / - List user's challenges
challenges.get("/", async (c) => {
  const user = c.get("user");
  const userChallenges = await getUserChallenges(c.env, user.id);
  return c.json({ data: { challenges: userChallenges } });
});

// POST / - Create a new challenge
challenges.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    mode: "daily_winner" | "cumulative";
    is_recurring?: boolean;
    recurring_interval?: "weekly" | "monthly";
  }>();

  if (!body.title || !body.start_date || !body.end_date || !body.mode) {
    return c.json({ error: "Title, start_date, end_date, and mode are required" }, 400);
  }

  if (body.mode !== "daily_winner" && body.mode !== "cumulative") {
    return c.json({ error: "Mode must be 'daily_winner' or 'cumulative'" }, 400);
  }

  if (new Date(body.start_date) > new Date(body.end_date)) {
    return c.json({ error: "Start date must be before end date" }, 400);
  }

  const challenge = await createChallenge(
    c.env,
    user.id,
    body.title,
    body.description || null,
    body.start_date,
    body.end_date,
    body.mode,
    user.timezone, // Use creator's timezone for the challenge
    body.is_recurring || false,
    body.recurring_interval || null
  );

  return c.json({ data: { challenge } }, 201);
});

// POST /join - Join a challenge with invite code
challenges.post("/join", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ invite_code: string }>();

  if (!body.invite_code) {
    return c.json({ error: "Invite code is required" }, 400);
  }

  const challenge = await getChallengeByInviteCode(c.env, body.invite_code);
  if (!challenge) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  const alreadyJoined = await isParticipant(c.env, challenge.id, user.id);
  if (alreadyJoined) {
    return c.json({ error: "Already a participant in this challenge" }, 400);
  }

  await joinChallenge(c.env, challenge.id, user.id);

  return c.json({ data: { challenge } });
});

// GET /:id - Get challenge details
challenges.get("/:id", async (c) => {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);

  const challenge = await getChallengeById(c.env, challengeId);
  if (!challenge) {
    return c.json({ error: "Challenge not found" }, 404);
  }

  // Check if user is a participant
  const participant = await isParticipant(c.env, challengeId, user.id);
  if (!participant) {
    return c.json({ error: "Not a participant in this challenge" }, 403);
  }

  const participants = await getChallengeParticipants(c.env, challengeId);

  return c.json({
    data: {
      challenge: {
        ...challenge,
        is_recurring: Boolean(challenge.is_recurring),
      },
      participants,
      participant_count: participants.length,
    },
  });
});

export default challenges;
