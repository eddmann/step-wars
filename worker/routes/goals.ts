import { Hono } from "hono";
import type { AppBindings, Env } from "../types";
import {
  getOrCreateUserGoals,
  updateUserGoals,
  toggleGoalsPause,
  getTodaySteps,
  getPendingNotifications,
  markNotificationsAsRead,
} from "../db/queries";
import { getDateInTimezone } from "../../shared/dateUtils";

async function getWeeklySteps(
  env: Env,
  userId: number,
  timezone: string
): Promise<number> {
  const today = getDateInTimezone(timezone);

  // Parse the date string to calculate start of week
  const [year, month, day] = today.split("-").map(Number);
  const todayDate = new Date(year, month - 1, day);

  // Get start of week (Monday)
  const dayOfWeek = todayDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
  const startDate = startOfWeek.toISOString().split("T")[0];

  const result = await env.DB.prepare(
    `SELECT COALESCE(SUM(step_count), 0) as total
     FROM step_entries
     WHERE user_id = ? AND date >= ? AND date <= ?`
  )
    .bind(userId, startDate, today)
    .first<{ total: number }>();

  return result?.total || 0;
}

const goals = new Hono<AppBindings>();

// GET / - Get user goals and progress
goals.get("/", async (c) => {
  const user = c.get("user");
  const userGoals = await getOrCreateUserGoals(c.env, user.id);

  // Get today's total steps across all challenges
  const today = getDateInTimezone(user.timezone);
  const todaySteps = await getTodaySteps(c.env, user.id, today);

  // Calculate weekly steps (last 7 days)
  const weeklySteps = await getWeeklySteps(c.env, user.id, user.timezone);

  // Get pending notifications
  const notifications = await getPendingNotifications(c.env, user.id);

  return c.json({
    data: {
      goals: {
        ...userGoals,
        is_paused: Boolean(userGoals.is_paused),
      },
      today_steps: todaySteps,
      weekly_steps: weeklySteps,
      daily_progress: Math.min(100, Math.round((todaySteps / userGoals.daily_target) * 100)),
      weekly_progress: Math.min(100, Math.round((weeklySteps / userGoals.weekly_target) * 100)),
      notifications,
    },
  });
});

// POST /notifications/read - Mark notifications as read
goals.post("/notifications/read", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ notification_ids: number[] }>();

  if (!body.notification_ids || !Array.isArray(body.notification_ids)) {
    return c.json({ error: "notification_ids array is required" }, 400);
  }

  await markNotificationsAsRead(c.env, user.id, body.notification_ids);

  return c.json({ data: { success: true } });
});

// PUT / - Update user goals
goals.put("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    daily_target?: number;
    weekly_target?: number;
  }>();

  // Get current goals
  const currentGoals = await getOrCreateUserGoals(c.env, user.id);

  const dailyTarget = body.daily_target ?? currentGoals.daily_target;
  const weeklyTarget = body.weekly_target ?? currentGoals.weekly_target;

  if (dailyTarget < 1000 || dailyTarget > 100000) {
    return c.json({ error: "Daily target must be between 1,000 and 100,000" }, 400);
  }

  if (weeklyTarget < 7000 || weeklyTarget > 700000) {
    return c.json({ error: "Weekly target must be between 7,000 and 700,000" }, 400);
  }

  const updatedGoals = await updateUserGoals(c.env, user.id, dailyTarget, weeklyTarget);

  return c.json({
    data: {
      goals: {
        ...updatedGoals,
        is_paused: Boolean(updatedGoals.is_paused),
      },
    },
  });
});

// POST /pause - Pause goals
goals.post("/pause", async (c) => {
  const user = c.get("user");
  const updatedGoals = await toggleGoalsPause(c.env, user.id, true);
  return c.json({
    data: {
      goals: {
        ...updatedGoals,
        is_paused: true,
      },
    },
  });
});

// POST /resume - Resume goals
goals.post("/resume", async (c) => {
  const user = c.get("user");
  const updatedGoals = await toggleGoalsPause(c.env, user.id, false);
  return c.json({
    data: {
      goals: {
        ...updatedGoals,
        is_paused: false,
      },
    },
  });
});

export default goals;
