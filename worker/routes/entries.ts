import type { Env, User } from "../types";
import { jsonResponse, errorResponse } from "../middleware/cors";
import {
  getChallengeById,
  isParticipant,
  getStepEntry,
  upsertStepEntry,
  getUserEntries,
} from "../db/queries";
import { EDIT_DEADLINE_HOUR, MIN_STEPS, MAX_STEPS } from "../../shared/constants";

// Check if a date is within the edit window
function canEditDate(dateStr: string, userTimezone: string): boolean {
  const now = new Date();

  // Get current date in user's timezone
  const userNow = new Date(
    now.toLocaleString("en-US", { timeZone: userTimezone })
  );
  const userToday = userNow.toISOString().split("T")[0];
  const userYesterday = new Date(userNow);
  userYesterday.setDate(userYesterday.getDate() - 1);
  const yesterdayStr = userYesterday.toISOString().split("T")[0];

  // Can always edit today
  if (dateStr === userToday) {
    return true;
  }

  // Can edit yesterday until noon today
  if (dateStr === yesterdayStr) {
    const currentHour = userNow.getHours();
    return currentHour < EDIT_DEADLINE_HOUR;
  }

  return false;
}

export async function handleEntries(
  request: Request,
  env: Env,
  user: User,
  path: string
): Promise<Response> {
  // Match /api/challenges/:id/entries
  const entriesMatch = path.match(/^\/api\/challenges\/(\d+)\/entries$/);
  if (entriesMatch) {
    const challengeId = parseInt(entriesMatch[1], 10);

    // Verify challenge exists and user is participant
    const challenge = await getChallengeById(env, challengeId);
    if (!challenge) {
      return errorResponse("Challenge not found", 404);
    }

    const participant = await isParticipant(env, challengeId, user.id);
    if (!participant) {
      return errorResponse("Not a participant in this challenge", 403);
    }

    // GET - List entries
    if (request.method === "GET") {
      const entries = await getUserEntries(env, user.id, challengeId);
      return jsonResponse({ data: { entries } });
    }

    // POST - Create/update entry
    if (request.method === "POST") {
      const body = (await request.json()) as {
        date: string;
        step_count: number;
        source?: string;
      };

      if (!body.date || body.step_count === undefined) {
        return errorResponse("Date and step_count are required");
      }

      // Validate step count
      if (body.step_count < MIN_STEPS || body.step_count > MAX_STEPS) {
        return errorResponse(`Step count must be between ${MIN_STEPS} and ${MAX_STEPS}`);
      }

      // Check edit window
      if (!canEditDate(body.date, user.timezone)) {
        return errorResponse(
          "Cannot edit steps for this date. Entries can only be modified until noon the next day."
        );
      }

      // Check date is within challenge period
      if (body.date < challenge.start_date || body.date > challenge.end_date) {
        return errorResponse("Date is outside the challenge period");
      }

      const entry = await upsertStepEntry(
        env,
        user.id,
        challengeId,
        body.date,
        body.step_count,
        body.source || "manual"
      );

      return jsonResponse({ data: { entry } });
    }
  }

  // Match /api/challenges/:id/entries/:date
  const entryDateMatch = path.match(
    /^\/api\/challenges\/(\d+)\/entries\/(\d{4}-\d{2}-\d{2})$/
  );
  if (entryDateMatch) {
    const challengeId = parseInt(entryDateMatch[1], 10);
    const date = entryDateMatch[2];

    // Verify challenge exists and user is participant
    const challenge = await getChallengeById(env, challengeId);
    if (!challenge) {
      return errorResponse("Challenge not found", 404);
    }

    const participant = await isParticipant(env, challengeId, user.id);
    if (!participant) {
      return errorResponse("Not a participant in this challenge", 403);
    }

    // GET - Get specific entry
    if (request.method === "GET") {
      const entry = await getStepEntry(env, user.id, challengeId, date);
      return jsonResponse({ data: { entry } });
    }

    // PUT - Update entry
    if (request.method === "PUT") {
      const body = (await request.json()) as {
        step_count: number;
        source?: string;
      };

      if (body.step_count === undefined) {
        return errorResponse("step_count is required");
      }

      // Validate step count
      if (body.step_count < MIN_STEPS || body.step_count > MAX_STEPS) {
        return errorResponse(`Step count must be between ${MIN_STEPS} and ${MAX_STEPS}`);
      }

      // Check edit window
      if (!canEditDate(date, user.timezone)) {
        return errorResponse(
          "Cannot edit steps for this date. Entries can only be modified until noon the next day."
        );
      }

      const entry = await upsertStepEntry(
        env,
        user.id,
        challengeId,
        date,
        body.step_count,
        body.source || "manual"
      );

      return jsonResponse({ data: { entry } });
    }
  }

  return errorResponse("Not found", 404);
}
