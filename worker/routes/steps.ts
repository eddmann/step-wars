import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import { getStepEntry, upsertStepEntry, getUserEntries } from "../db/queries";
import { EDIT_DEADLINE_HOUR, MIN_STEPS, MAX_STEPS } from "../../shared/constants";
import { getDateTimeInTimezone, getYesterdayInTimezone } from "../../shared/dateUtils";

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

export async function handleSteps(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // GET /api/steps - Get user's step entries
  if (path === "/api/steps" && request.method === "GET") {
    const entries = await getUserEntries(env, user.id);
    return jsonResponse({ data: { entries } });
  }

  // POST /api/steps - Log global steps
  if (path === "/api/steps" && request.method === "POST") {
    const body = (await request.json()) as {
      date: string;
      step_count: number;
      source?: string;
    };

    if (!body.date || body.step_count === undefined) {
      return errorResponse("Date and step_count are required");
    }

    if (body.step_count < MIN_STEPS || body.step_count > MAX_STEPS) {
      return errorResponse(`Step count must be between ${MIN_STEPS} and ${MAX_STEPS}`);
    }

    if (!canEditDate(body.date, user.timezone)) {
      return errorResponse(
        "Cannot edit steps for this date. Entries can only be modified until noon the next day."
      );
    }

    const entry = await upsertStepEntry(
      env,
      user.id,
      body.date,
      body.step_count,
      body.source || "manual"
    );

    return jsonResponse({ data: { entry } });
  }

  // GET /api/steps/:date - Get specific date entry
  const dateMatch = path.match(/^\/api\/steps\/(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch && request.method === "GET") {
    const date = dateMatch[1];
    const entry = await getStepEntry(env, user.id, date);
    return jsonResponse({ data: { entry } });
  }

  return errorResponse("Not found", 404);
}
