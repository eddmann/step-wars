import { Hono } from "hono";
import type { AppBindings } from "../types";
import { createD1ChallengeRepository } from "../repositories/d1/challenge.d1";
import { createD1ParticipantRepository } from "../repositories/d1/participant.d1";
import { listUserChallenges } from "../usecases/list-user-challenges.usecase";
import { createChallenge } from "../usecases/create-challenge.usecase";
import { joinChallenge } from "../usecases/join-challenge.usecase";
import { getChallenge } from "../usecases/get-challenge.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

const challenges = new Hono<AppBindings>();

// GET / - List user's challenges
challenges.get("/", async (c) => {
  const user = c.get("user");

  const challengeRepository = createD1ChallengeRepository(c.env);
  const result = await listUserChallenges(
    { challengeRepository },
    { userId: user.id },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { challenges: result.value } });
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
    return c.json(
      { error: "Title, start_date, end_date, and mode are required" },
      400,
    );
  }

  if (body.mode !== "daily_winner" && body.mode !== "cumulative") {
    return c.json(
      { error: "Mode must be 'daily_winner' or 'cumulative'" },
      400,
    );
  }

  if (new Date(body.start_date) > new Date(body.end_date)) {
    return c.json({ error: "Start date must be before end date" }, 400);
  }

  const challengeRepository = createD1ChallengeRepository(c.env);
  const participantRepository = createD1ParticipantRepository(c.env);

  const result = await createChallenge(
    { challengeRepository, participantRepository },
    {
      creatorId: user.id,
      title: body.title,
      description: body.description || null,
      startDate: body.start_date,
      endDate: body.end_date,
      mode: body.mode,
      timezone: user.timezone,
      isRecurring: body.is_recurring || false,
      recurringInterval: body.recurring_interval || null,
    },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { challenge: result.value } }, 201);
});

// POST /join - Join a challenge with invite code
challenges.post("/join", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ invite_code: string }>();

  if (!body.invite_code) {
    return c.json({ error: "Invite code is required" }, 400);
  }

  const challengeRepository = createD1ChallengeRepository(c.env);
  const participantRepository = createD1ParticipantRepository(c.env);

  const result = await joinChallenge(
    { challengeRepository, participantRepository },
    { userId: user.id, inviteCode: body.invite_code },
  );

  if (!result.ok) {
    if (result.error.code === "CONFLICT") {
      return c.json({ error: errorToMessage(result.error) }, 400);
    }
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { challenge: result.value } });
});

// GET /:id - Get challenge details
challenges.get("/:id", async (c) => {
  const user = c.get("user");
  const challengeId = parseInt(c.req.param("id"), 10);

  const challengeRepository = createD1ChallengeRepository(c.env);
  const participantRepository = createD1ParticipantRepository(c.env);

  const result = await getChallenge(
    { challengeRepository, participantRepository },
    { userId: user.id, challengeId },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  const participants = result.value.participants;

  return c.json({
    data: {
      challenge: {
        ...result.value.challenge,
        is_recurring: Boolean(result.value.challenge.is_recurring),
      },
      participants,
      participant_count: participants.length,
    },
  });
});

export default challenges;
