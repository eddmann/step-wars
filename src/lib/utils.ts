import { EDIT_DEADLINE_HOUR } from "@shared/constants";

/**
 * Utility for merging class names
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
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
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
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
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: getBrowserTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Get yesterday's date in YYYY-MM-DD format (timezone-aware)
 */
export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: getBrowserTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Get current hour in browser's timezone (0-23)
 */
function getCurrentHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: getBrowserTimezone(),
    hour: 'numeric',
    hour12: false
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
    case "streak_60":
    case "streak_100":
      return { bg: "bg-orange-100", text: "text-orange-800", icon: "flame" };
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
    case "streak_60":
      return "60 Day Streak";
    case "streak_100":
      return "100 Day Streak";
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
