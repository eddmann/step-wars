import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "../types";
import { MIN_STEPS, MAX_STEPS } from "../../shared/constants";
import { createD1StepEntryRepository } from "../repositories/d1/step-entry.d1";
import { createD1UserRepository } from "../repositories/d1/user.d1";
import { createD1GoalsRepository } from "../repositories/d1/goals.d1";
import { createD1BadgeRepository } from "../repositories/d1/badge.d1";
import { listSteps } from "../usecases/list-steps.usecase";
import { upsertSteps } from "../usecases/upsert-steps.usecase";
import { getStepEntry } from "../usecases/get-step-entry.usecase";
import { errorToHttpStatus, errorToMessage } from "../usecases/errors";

const stepEntrySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  step_count: z
    .number()
    .int()
    .min(MIN_STEPS)
    .max(MAX_STEPS, `Step count must be at most ${MAX_STEPS}`),
  source: z
    .enum(["manual", "healthkit", "google_fit", "garmin", "strava"])
    .optional(),
});

const steps = new Hono<AppBindings>();

// GET / - Get user's step entries
steps.get("/", async (c) => {
  const user = c.get("user");
  const stepEntryRepository = createD1StepEntryRepository(c.env);

  const result = await listSteps({ stepEntryRepository }, { userId: user.id });

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { entries: result.value } });
});

// POST / - Log global steps
steps.post("/", zValidator("json", stepEntrySchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  const stepEntryRepository = createD1StepEntryRepository(c.env);
  const userRepository = createD1UserRepository(c.env);
  const goalsRepository = createD1GoalsRepository(c.env);
  const badgeRepository = createD1BadgeRepository(c.env);

  const result = await upsertSteps(
    { stepEntryRepository, userRepository, goalsRepository, badgeRepository },
    {
      userId: user.id,
      userTimezone: user.timezone,
      date: body.date,
      stepCount: body.step_count,
      source: body.source,
    },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { entry: result.value } });
});

// GET /:date - Get specific date entry
steps.get("/:date", async (c) => {
  const user = c.get("user");
  const date = c.req.param("date");

  const stepEntryRepository = createD1StepEntryRepository(c.env);
  const result = await getStepEntry(
    { stepEntryRepository },
    { userId: user.id, date },
  );

  if (!result.ok) {
    return c.json(
      { error: errorToMessage(result.error) },
      errorToHttpStatus(result.error),
    );
  }

  return c.json({ data: { entry: result.value } });
});

export default steps;
