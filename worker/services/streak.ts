import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import {
  getDateInTimezone,
  getYesterdayInTimezone,
} from "../../shared/dateUtils";
import { STREAK_MILESTONES } from "../../shared/constants";
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
