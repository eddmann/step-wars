import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import {
  getDateInTimezone,
  getYesterdayInTimezone,
} from "../../shared/dateUtils";
import { STREAK_MILESTONES, MARATHON_DAY_STEPS } from "../../shared/constants";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface StreakServiceDeps {
  userRepository: UserRepository;
  goalsRepository: GoalsRepository;
  stepEntryRepository: StepEntryRepository;
  badgeRepository: BadgeRepository;
  clock?: Clock;
}

/**
 * Calculate and update a user's streak after they log steps.
 * Awards badges for streak milestones.
 */
export async function updateUserStreak(
  deps: StreakServiceDeps,
  userId: number,
): Promise<void> {
  const user = await deps.userRepository.getById(userId);
  if (!user) return;

  const goals = await deps.goalsRepository.getOrCreate(userId);
  const now = (deps.clock ?? systemClock).now();
  const today = getDateInTimezone(user.timezone, now);
  const yesterday = getYesterdayInTimezone(user.timezone, now);

  const maxStreakToCheck = Math.max(...STREAK_MILESTONES) + 10;
  const entries = await deps.stepEntryRepository.listRecentForUser(
    userId,
    maxStreakToCheck,
  );

  const stepsByDate = new Map<string, number>();
  for (const entry of entries) {
    stepsByDate.set(entry.date, entry.step_count);
  }

  let currentStreak = 0;
  let checkDate = today;

  const todaySteps = stepsByDate.get(today) || 0;
  if (todaySteps >= goals.daily_target) {
    currentStreak = 1;
    checkDate = yesterday;
  } else {
    const yesterdaySteps = stepsByDate.get(yesterday) || 0;
    if (yesterdaySteps >= goals.daily_target) {
      currentStreak = 1;
      checkDate = getPreviousDate(yesterday);
    } else {
      currentStreak = 0;
    }
  }

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

  let lastAchievedDate: string | null = null;
  if (todaySteps >= goals.daily_target) {
    lastAchievedDate = today;
  } else {
    const yesterdaySteps = stepsByDate.get(yesterday) || 0;
    if (yesterdaySteps >= goals.daily_target) {
      lastAchievedDate = yesterday;
    }
  }

  const longestStreak = Math.max(goals.longest_streak, currentStreak);

  await deps.goalsRepository.updateStreak(
    userId,
    currentStreak,
    longestStreak,
    lastAchievedDate,
  );

  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak >= milestone) {
      await deps.badgeRepository.award(userId, `streak_${milestone}`);
    }
  }

  // Marathon Day: 20k+ steps in a single day
  if (todaySteps >= MARATHON_DAY_STEPS) {
    await deps.badgeRepository.award(userId, "marathon_day");
  }

  // Perfect Week: hit goal every day Mon-Sun
  if (todaySteps >= goals.daily_target) {
    await checkPerfectWeek(deps, userId, today, goals.daily_target);
  }
}

async function checkPerfectWeek(
  deps: StreakServiceDeps,
  userId: number,
  today: string,
  dailyTarget: number,
): Promise<void> {
  const todayDate = new Date(today + "T00:00:00");
  const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon, ...
  // Only check when today is Sunday (end of the week)
  if (dayOfWeek !== 0) return;

  // Get Monday through Sunday
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() - 6);
  const entries = await deps.stepEntryRepository.listRecentForUser(userId, 14);
  const stepsByDate = new Map<string, number>();
  for (const entry of entries) {
    stepsByDate.set(entry.date, entry.step_count);
  }

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateStr(d);
    const steps = stepsByDate.get(dateStr) || 0;
    if (steps < dailyTarget) return;
  }

  await deps.badgeRepository.award(userId, "perfect_week");
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPreviousDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
