import type { UserRepository } from "../repositories/interfaces/user.repository";
import type { GoalsRepository } from "../repositories/interfaces/goals.repository";
import type { StepEntryRepository } from "../repositories/interfaces/step-entry.repository";
import type { BadgeRepository } from "../repositories/interfaces/badge.repository";
import type { StatsRepository } from "../repositories/interfaces/stats.repository";
import {
  getDateInTimezone,
  getDateTimeInTimezone,
  getYesterdayInTimezone,
} from "../../shared/dateUtils";
import {
  STREAK_MILESTONES,
  MARATHON_DAY_STEPS,
  ULTRA_MARATHON_STEPS,
  TOTAL_STEPS_MILESTONES,
  CONSISTENT_CLIMBER_DAYS,
  WEEKEND_WARRIOR_WEEKS,
  WEEKEND_WARRIOR_STEPS,
} from "../../shared/constants";
import type { Clock } from "../utils/clock";
import { systemClock } from "../utils/clock";

export interface StreakServiceDeps {
  userRepository: UserRepository;
  goalsRepository: GoalsRepository;
  stepEntryRepository: StepEntryRepository;
  badgeRepository: BadgeRepository;
  statsRepository?: StatsRepository;
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

  // Ultra Marathon: 40k+ steps in a single day
  if (todaySteps >= ULTRA_MARATHON_STEPS) {
    await deps.badgeRepository.award(userId, "ultra_marathon");
  }

  // Perfect Week: hit goal every day Mon-Sun
  if (todaySteps >= goals.daily_target) {
    await checkPerfectWeek(deps, userId, today, goals.daily_target);
  }

  // Early Bird: log steps before 8 AM in user's timezone
  const now2 = (deps.clock ?? systemClock).now();
  const { hour: currentHour } = getDateTimeInTimezone(user.timezone, now2);
  if (currentHour < 8) {
    await deps.badgeRepository.award(userId, "early_bird");
  }

  // Total steps milestones (1M, 3M, 5M)
  if (deps.statsRepository) {
    const stats = await deps.statsRepository.getUserStats(userId);
    for (const milestone of TOTAL_STEPS_MILESTONES) {
      if (stats.total_steps >= milestone) {
        const label = `steps_${milestone / 1_000_000}m`;
        await deps.badgeRepository.award(userId, label);
      }
    }

    // Social Butterfly: joined 5+ challenges
    if (stats.challenges_joined >= 5) {
      await deps.badgeRepository.award(userId, "social_butterfly");
    }
  }

  // Consistent Climber: increasing steps for 7 consecutive days
  await checkConsistentClimber(deps, userId, entries);

  // Weekend Warrior: 10k+ steps on Sat & Sun for 4 consecutive weekends
  await checkWeekendWarrior(deps, userId, entries);
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

async function checkConsistentClimber(
  deps: StreakServiceDeps,
  userId: number,
  entries: { date: string; step_count: number }[],
): Promise<void> {
  if (entries.length < CONSISTENT_CLIMBER_DAYS) return;

  // Entries are sorted desc by date, we need ascending order for the check
  const sorted = entries
    .slice(0, CONSISTENT_CLIMBER_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Verify they are consecutive days and each day is strictly greater than the previous
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = sorted[i - 1].date;
    const currDate = sorted[i].date;
    const expectedNext = nextDate(prevDate);
    if (currDate !== expectedNext) return;
    if (sorted[i].step_count <= sorted[i - 1].step_count) return;
  }

  await deps.badgeRepository.award(userId, "consistent_climber");
}

function nextDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return formatDateStr(date);
}

async function checkWeekendWarrior(
  deps: StreakServiceDeps,
  userId: number,
  entries: { date: string; step_count: number }[],
): Promise<void> {
  const stepsByDate = new Map<string, number>();
  for (const entry of entries) {
    stepsByDate.set(entry.date, entry.step_count);
  }

  // Check the last 4 weekends (most recent first)
  // Find the most recent Sunday from entries
  const sortedDates = entries
    .map((e) => e.date)
    .sort((a, b) => b.localeCompare(a));
  if (sortedDates.length === 0) return;

  const latestDateStr = sortedDates[0];
  const latestDate = new Date(latestDateStr + "T00:00:00");

  // Find the most recent Sunday on or before the latest date
  let sunday = new Date(latestDate);
  while (sunday.getDay() !== 0) {
    sunday.setDate(sunday.getDate() - 1);
  }

  let consecutiveWeekends = 0;
  for (let w = 0; w < WEEKEND_WARRIOR_WEEKS; w++) {
    const satDate = new Date(sunday);
    satDate.setDate(satDate.getDate() - 1);
    const satStr = formatDateStr(satDate);
    const sunStr = formatDateStr(sunday);

    const satSteps = stepsByDate.get(satStr) || 0;
    const sunSteps = stepsByDate.get(sunStr) || 0;

    if (
      satSteps >= WEEKEND_WARRIOR_STEPS &&
      sunSteps >= WEEKEND_WARRIOR_STEPS
    ) {
      consecutiveWeekends++;
    } else {
      break;
    }

    // Move back one week
    sunday.setDate(sunday.getDate() - 7);
  }

  if (consecutiveWeekends >= WEEKEND_WARRIOR_WEEKS) {
    await deps.badgeRepository.award(userId, "weekend_warrior");
  }
}
