import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import {
  getOrCreateUserGoals,
  updateUserGoals,
  toggleGoalsPause,
  getTodaySteps,
  getPendingNotifications,
  markNotificationsAsRead,
} from "../db/queries";
import { getDateInTimezone } from "../../shared/dateUtils";

export async function handleGoals(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // GET /api/goals
  if (path === "/api/goals" && request.method === "GET") {
    const goals = await getOrCreateUserGoals(env, user.id);

    // Get today's total steps across all challenges
    const today = getDateInTimezone(user.timezone);
    const todaySteps = await getTodaySteps(env, user.id, today);

    // Calculate weekly steps (last 7 days)
    const weeklySteps = await getWeeklySteps(env, user.id, user.timezone);

    // Get pending notifications
    const notifications = await getPendingNotifications(env, user.id);

    return jsonResponse({
      data: {
        goals: {
          ...goals,
          is_paused: Boolean(goals.is_paused),
        },
        today_steps: todaySteps,
        weekly_steps: weeklySteps,
        daily_progress: Math.min(100, Math.round((todaySteps / goals.daily_target) * 100)),
        weekly_progress: Math.min(100, Math.round((weeklySteps / goals.weekly_target) * 100)),
        notifications,
      },
    });
  }

  // POST /api/goals/notifications/read - Mark notifications as read
  if (path === "/api/goals/notifications/read" && request.method === "POST") {
    const body = (await request.json()) as { notification_ids: number[] };

    if (!body.notification_ids || !Array.isArray(body.notification_ids)) {
      return errorResponse("notification_ids array is required");
    }

    await markNotificationsAsRead(env, body.notification_ids);

    return jsonResponse({ data: { success: true } });
  }

  // PUT /api/goals
  if (path === "/api/goals" && request.method === "PUT") {
    const body = (await request.json()) as {
      daily_target?: number;
      weekly_target?: number;
    };

    // Get current goals
    const currentGoals = await getOrCreateUserGoals(env, user.id);

    const dailyTarget = body.daily_target ?? currentGoals.daily_target;
    const weeklyTarget = body.weekly_target ?? currentGoals.weekly_target;

    if (dailyTarget < 1000 || dailyTarget > 100000) {
      return errorResponse("Daily target must be between 1,000 and 100,000");
    }

    if (weeklyTarget < 7000 || weeklyTarget > 700000) {
      return errorResponse("Weekly target must be between 7,000 and 700,000");
    }

    const goals = await updateUserGoals(env, user.id, dailyTarget, weeklyTarget);

    return jsonResponse({
      data: {
        goals: {
          ...goals,
          is_paused: Boolean(goals.is_paused),
        },
      },
    });
  }

  // POST /api/goals/pause
  if (path === "/api/goals/pause" && request.method === "POST") {
    const goals = await toggleGoalsPause(env, user.id, true);
    return jsonResponse({
      data: {
        goals: {
          ...goals,
          is_paused: true,
        },
      },
    });
  }

  // POST /api/goals/resume
  if (path === "/api/goals/resume" && request.method === "POST") {
    const goals = await toggleGoalsPause(env, user.id, false);
    return jsonResponse({
      data: {
        goals: {
          ...goals,
          is_paused: false,
        },
      },
    });
  }

  return errorResponse("Not found", 404);
}

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
