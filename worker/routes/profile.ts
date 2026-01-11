import { Hono } from "hono";
import type { AppBindings } from "../types";
import { updateUser, getUserBadges, getUserStats, getTodaySteps } from "../db/queries";
import { getDateInTimezone } from "../../shared/dateUtils";

const profile = new Hono<AppBindings>();

// GET / - Get user profile
profile.get("/", async (c) => {
  const user = c.get("user");
  const badges = await getUserBadges(c.env, user.id);
  const stats = await getUserStats(c.env, user.id);

  // Get today's steps
  const today = getDateInTimezone(user.timezone);
  const todaySteps = await getTodaySteps(c.env, user.id, today);

  return c.json({
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        created_at: user.created_at,
      },
      stats: {
        ...stats,
        today_steps: todaySteps,
      },
      badges,
    },
  });
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
  const timezone = body.timezone; // Optional - only update if provided

  if (!name || name.length < 2) {
    return c.json({ error: "Name must be at least 2 characters" }, 400);
  }

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email is required" }, 400);
  }

  const updatedUser = await updateUser(c.env, user.id, name, email.toLowerCase(), timezone);

  return c.json({
    data: {
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        timezone: updatedUser!.timezone,
        created_at: updatedUser!.created_at,
      },
    },
  });
});

// GET /badges - Get user badges
profile.get("/badges", async (c) => {
  const user = c.get("user");
  const badges = await getUserBadges(c.env, user.id);
  return c.json({ data: { badges } });
});

export default profile;
