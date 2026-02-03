import { Hono } from "hono";
import type { AppBindings } from "../types";
import { createD1UserRepository } from "../repositories/d1/user.d1";
import { createD1BadgeRepository } from "../repositories/d1/badge.d1";
import { createD1StatsRepository } from "../repositories/d1/stats.d1";
import { createD1StepEntryRepository } from "../repositories/d1/step-entry.d1";
import { getProfile } from "../usecases/get-profile.usecase";
import { updateProfile } from "../usecases/update-profile.usecase";
import { getBadges } from "../usecases/get-badges.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

const profile = new Hono<AppBindings>();

// GET / - Get user profile
profile.get("/", async (c) => {
  const user = c.get("user");

  const statsRepository = createD1StatsRepository(c.env);
  const badgeRepository = createD1BadgeRepository(c.env);
  const stepEntryRepository = createD1StepEntryRepository(c.env);

  const result = await getProfile(
    { statsRepository, badgeRepository, stepEntryRepository },
    { user },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
});

// PUT / - Update user profile
profile.put("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    name?: string;
    email?: string;
    timezone?: string;
  }>();

  const name = body.name ?? user.name;
  const email = body.email ?? user.email;
  const timezone = body.timezone;

  if (!name || name.length < 2) {
    return c.json({ error: "Name must be at least 2 characters" }, 400);
  }

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email is required" }, 400);
  }

  const userRepository = createD1UserRepository(c.env);
  const result = await updateProfile(
    { userRepository },
    { userId: user.id, name, email: email.toLowerCase(), timezone },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({
    data: {
      user: {
        id: result.value.id,
        email: result.value.email,
        name: result.value.name,
        timezone: result.value.timezone,
        created_at: result.value.created_at,
      },
    },
  });
});

// GET /badges - Get user badges
profile.get("/badges", async (c) => {
  const user = c.get("user");
  const badgeRepository = createD1BadgeRepository(c.env);

  const result = await getBadges({ badgeRepository }, { userId: user.id });

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { badges: result.value } });
});

export default profile;
