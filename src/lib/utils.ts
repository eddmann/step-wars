import { EDIT_DEADLINE_HOUR } from "../../shared/constants";

/**
 * Utility for merging class names
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a date string for display
 * Handles both YYYY-MM-DD and YYYY-MM-DD HH:MM:SS (SQLite datetime) formats
 */
export function formatDate(dateStr: string): string {
  let date: Date;
  if (dateStr.includes(" ") || dateStr.includes("T")) {
    // Full timestamp (SQLite datetime or ISO format)
    date = new Date(dateStr.replace(" ", "T"));
  } else {
    // Date-only string (YYYY-MM-DD)
    date = new Date(dateStr + "T00:00:00");
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date string as relative time (Today, Yesterday, etc)
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return "Today";
  }
  if (date.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  return formatDate(dateStr);
}

/**
 * Get the browser's timezone
 */
function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get today's date in YYYY-MM-DD format (timezone-aware)
 */
export function getToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: getBrowserTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Get yesterday's date in YYYY-MM-DD format (timezone-aware)
 */
export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: getBrowserTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Get current hour in browser's timezone (0-23)
 */
function getCurrentHour(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: getBrowserTimezone(),
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Check if a date can still be edited (before noon the next day)
 */
export function canEditDate(dateStr: string): boolean {
  const today = getToday();
  const yesterday = getYesterday();

  // Can always edit today
  if (dateStr === today) {
    return true;
  }

  // Can edit yesterday until noon (in browser's timezone)
  if (dateStr === yesterday) {
    return getCurrentHour() < EDIT_DEADLINE_HOUR;
  }

  return false;
}

/**
 * Get time remaining until edit deadline
 */
export function getEditDeadline(dateStr: string): string | null {
  if (dateStr === getToday()) {
    return "until tomorrow at noon";
  }

  if (dateStr === getYesterday()) {
    const hoursLeft = EDIT_DEADLINE_HOUR - getCurrentHour();
    if (hoursLeft > 0) {
      return `${hoursLeft} hour${hoursLeft === 1 ? "" : "s"} left to edit`;
    }
    return null;
  }

  return null;
}

/**
 * Calculate percentage for progress displays
 */
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

/**
 * Get the class names for a badge type
 */
export function getBadgeStyle(badgeType: string): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (badgeType) {
    case "daily_winner":
      return { bg: "bg-amber-100", text: "text-amber-800", icon: "sun" };
    case "challenge_winner":
      return { bg: "bg-yellow-100", text: "text-yellow-800", icon: "trophy" };
    case "streak_7":
    case "streak_14":
    case "streak_30":
    case "streak_50":
    case "streak_100":
      return { bg: "bg-orange-100", text: "text-orange-800", icon: "flame" };
    case "marathon_day":
      return { bg: "bg-blue-100", text: "text-blue-800", icon: "footprints" };
    case "perfect_week":
      return { bg: "bg-green-100", text: "text-green-800", icon: "calendar" };
    case "early_bird":
      return { bg: "bg-sky-100", text: "text-sky-800", icon: "sunrise" };
    case "steps_1m":
    case "steps_3m":
    case "steps_5m":
      return {
        bg: "bg-purple-100",
        text: "text-purple-800",
        icon: "milestone",
      };
    case "comeback_kid":
      return { bg: "bg-teal-100", text: "text-teal-800", icon: "refresh" };
    case "social_butterfly":
      return { bg: "bg-pink-100", text: "text-pink-800", icon: "users" };
    case "iron_walker":
      return { bg: "bg-slate-100", text: "text-slate-800", icon: "shield" };
    case "ultra_marathon":
      return { bg: "bg-indigo-100", text: "text-indigo-800", icon: "mountain" };
    case "weekend_warrior":
      return { bg: "bg-red-100", text: "text-red-800", icon: "sword" };
    case "rival":
      return {
        bg: "bg-emerald-100",
        text: "text-emerald-800",
        icon: "handshake",
      };
    case "consistent_climber":
      return { bg: "bg-cyan-100", text: "text-cyan-800", icon: "trending-up" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", icon: "award" };
  }
}

/**
 * Get human-readable badge name
 */
export function getBadgeName(badgeType: string): string {
  switch (badgeType) {
    case "daily_winner":
      return "Daily Winner";
    case "challenge_winner":
      return "Challenge Champion";
    case "streak_7":
      return "7 Day Streak";
    case "streak_14":
      return "14 Day Streak";
    case "streak_30":
      return "30 Day Streak";
    case "streak_50":
      return "50 Day Streak";
    case "streak_100":
      return "100 Day Streak";
    case "marathon_day":
      return "Marathon Day";
    case "perfect_week":
      return "Perfect Week";
    case "early_bird":
      return "Early Bird";
    case "steps_1m":
      return "1M Steps";
    case "steps_3m":
      return "3M Steps";
    case "steps_5m":
      return "5M Steps";
    case "comeback_kid":
      return "Comeback Kid";
    case "social_butterfly":
      return "Social Butterfly";
    case "iron_walker":
      return "Iron Walker";
    case "ultra_marathon":
      return "Ultra Marathon";
    case "weekend_warrior":
      return "Weekend Warrior";
    case "rival":
      return "Rival";
    case "consistent_climber":
      return "Consistent Climber";
    default:
      return badgeType;
  }
}

/**
 * Generate a greeting based on time of day (timezone-aware)
 */
export function getGreeting(): string {
  const hour = getCurrentHour();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
