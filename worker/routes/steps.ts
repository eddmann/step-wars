import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AppBindings } from "../types";
import { getStepEntry, upsertStepEntry, getUserEntries } from "../db/queries";
import { EDIT_DEADLINE_HOUR, MIN_STEPS, MAX_STEPS } from "../../shared/constants";
import { getDateTimeInTimezone, getYesterdayInTimezone } from "../../shared/dateUtils";
import { updateUserStreak } from "../services/streak";

// Validation schemas
const stepEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  step_count: z.number().int().min(MIN_STEPS).max(MAX_STEPS, `Step count must be at most ${MAX_STEPS}`),
  source: z.enum(["manual", "healthkit", "google_fit", "garmin", "strava"]).optional(),
});

// Check if a date is within the edit window
function canEditDate(dateStr: string, userTimezone: string): boolean {
  const { date: today, hour } = getDateTimeInTimezone(userTimezone);
  const yesterday = getYesterdayInTimezone(userTimezone);

  if (dateStr === today) return true;
  if (dateStr === yesterday) {
    return hour < EDIT_DEADLINE_HOUR;
  }
  return false;
}

const steps = new Hono<AppBindings>();

// GET / - Get user's step entries
steps.get("/", async (c) => {
  const user = c.get("user");
  const entries = await getUserEntries(c.env, user.id);
  return c.json({ data: { entries } });
});

// POST / - Log global steps
steps.post("/", zValidator("json", stepEntrySchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");

  if (!canEditDate(body.date, user.timezone)) {
    return c.json(
      { error: "Cannot edit steps for this date. Entries can only be modified until noon the next day." },
      400
    );
  }

  const entry = await upsertStepEntry(
    c.env,
    user.id,
    body.date,
    body.step_count,
    body.source || "manual"
  );

  // Update user's streak after logging steps
  await updateUserStreak(c.env, user.id);

  return c.json({ data: { entry } });
});

// GET /:date - Get specific date entry
steps.get("/:date", async (c) => {
  const user = c.get("user");
  const date = c.req.param("date");
  const entry = await getStepEntry(c.env, user.id, date);
  return c.json({ data: { entry } });
});

export default steps;
