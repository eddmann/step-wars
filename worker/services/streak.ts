import type { Env } from "../types";
import {
  getOrCreateUserGoals,
  getRecentStepEntries,
  updateStreak,
  awardBadge,
  getUserById,
} from "../db/queries";
import { getDateInTimezone, getYesterdayInTimezone } from "../../shared/dateUtils";
import { STREAK_MILESTONES } from "../../shared/constants";

/**
 * Calculate and update a user's streak after they log steps.
 * Awards badges for streak milestones.
 */
export async function updateUserStreak(env: Env, userId: number): Promise<void> {
  // Get user's timezone
  const user = await getUserById(env, userId);
  if (!user) return;

  const goals = await getOrCreateUserGoals(env, userId);
  const today = getDateInTimezone(user.timezone);
  const yesterday = getYesterdayInTimezone(user.timezone);

  // Get recent entries (enough for max streak milestone + buffer)
  const maxStreakToCheck = Math.max(...STREAK_MILESTONES) + 10;
  const entries = await getRecentStepEntries(env, userId, maxStreakToCheck);

  // Build a map of date -> step_count for quick lookup
  const stepsByDate = new Map<string, number>();
  for (const entry of entries) {
    stepsByDate.set(entry.date, entry.step_count);
  }

  // Calculate current streak
  // A streak counts consecutive days where steps >= daily_target
  // We start checking from today or yesterday (if today hasn't met the goal yet)
  let currentStreak = 0;
  let checkDate = today;

  // Check if today met the goal
  const todaySteps = stepsByDate.get(today) || 0;
  if (todaySteps >= goals.daily_target) {
    currentStreak = 1;
    checkDate = yesterday;
  } else {
    // Today didn't meet goal - check if yesterday started a streak
    const yesterdaySteps = stepsByDate.get(yesterday) || 0;
    if (yesterdaySteps >= goals.daily_target) {
      currentStreak = 1;
      // Continue checking from day before yesterday
      checkDate = getPreviousDate(yesterday);
    } else {
      // No streak
      currentStreak = 0;
    }
  }

  // Continue counting consecutive days backwards
  if (currentStreak > 0) {
    while (true) {
      const steps = stepsByDate.get(checkDate);
      if (steps !== undefined && steps >= goals.daily_target) {
        currentStreak++;
        checkDate = getPreviousDate(checkDate);
      } else {
        break;
      }
    }
  }

  // Determine last achieved date
  let lastAchievedDate: string | null = null;
  if (todaySteps >= goals.daily_target) {
    lastAchievedDate = today;
  } else {
    const yesterdaySteps = stepsByDate.get(yesterday) || 0;
    if (yesterdaySteps >= goals.daily_target) {
      lastAchievedDate = yesterday;
    }
  }

  // Update longest streak if current is higher
  const longestStreak = Math.max(goals.longest_streak, currentStreak);

  // Update streak in database
  await updateStreak(env, userId, currentStreak, longestStreak, lastAchievedDate);

  // Award badges for milestones reached
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      const badge = await awardBadge(env, userId, `streak_${milestone}`);
      if (badge) {
        // Badge was newly awarded - could add notification here if desired
        console.log(`[Streak] User ${userId} earned streak_${milestone} badge`);
      }
    }
  }
}

/**
 * Get the previous date (subtract 1 day) from a YYYY-MM-DD string.
 */
function getPreviousDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
