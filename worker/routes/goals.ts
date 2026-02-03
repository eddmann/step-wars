import { Hono } from "hono";
import type { AppBindings } from "../types";
import { createD1GoalsRepository } from "../repositories/d1/goals.d1";
import { createD1StepEntryRepository } from "../repositories/d1/step-entry.d1";
import { createD1NotificationRepository } from "../repositories/d1/notification.d1";
import { getGoals } from "../usecases/get-goals.usecase";
import { updateGoals } from "../usecases/update-goals.usecase";
import { pauseGoals } from "../usecases/pause-goals.usecase";
import { resumeGoals } from "../usecases/resume-goals.usecase";
import { markNotificationsRead } from "../usecases/mark-notifications-read.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

const goals = new Hono<AppBindings>();

// GET / - Get user goals and progress
goals.get("/", async (c) => {
  const user = c.get("user");

  const goalsRepository = createD1GoalsRepository(c.env);
  const stepEntryRepository = createD1StepEntryRepository(c.env);
  const notificationRepository = createD1NotificationRepository(c.env);

  const result = await getGoals(
    { goalsRepository, stepEntryRepository, notificationRepository },
    { userId: user.id, timezone: user.timezone },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
});

// POST /notifications/read - Mark notifications as read
goals.post("/notifications/read", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ notification_ids: number[] }>();

  if (!body.notification_ids || !Array.isArray(body.notification_ids)) {
    return c.json({ error: "notification_ids array is required" }, 400);
  }

  const notificationRepository = createD1NotificationRepository(c.env);
  const result = await markNotificationsRead(
    { notificationRepository },
    { userId: user.id, notificationIds: body.notification_ids },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { success: true } });
});

// PUT / - Update user goals
goals.put("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    daily_target?: number;
    weekly_target?: number;
  }>();

  const goalsRepository = createD1GoalsRepository(c.env);

  // Get current goals to validate ranges against defaults
  const currentGoals = await goalsRepository.getOrCreate(user.id);

  const dailyTarget = body.daily_target ?? currentGoals.daily_target;
  const weeklyTarget = body.weekly_target ?? currentGoals.weekly_target;

  if (dailyTarget < 1000 || dailyTarget > 100000) {
    return c.json(
      { error: "Daily target must be between 1,000 and 100,000" },
      400,
    );
  }

  if (weeklyTarget < 7000 || weeklyTarget > 700000) {
    return c.json(
      { error: "Weekly target must be between 7,000 and 700,000" },
      400,
    );
  }

  const result = await updateGoals(
    { goalsRepository },
    { userId: user.id, dailyTarget, weeklyTarget },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
});

// POST /pause - Pause goals
goals.post("/pause", async (c) => {
  const user = c.get("user");
  const goalsRepository = createD1GoalsRepository(c.env);

  const result = await pauseGoals({ goalsRepository }, { userId: user.id });

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
});

// POST /resume - Resume goals
goals.post("/resume", async (c) => {
  const user = c.get("user");
  const goalsRepository = createD1GoalsRepository(c.env);

  const result = await resumeGoals({ goalsRepository }, { userId: user.id });

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: result.value });
});

export default goals;
