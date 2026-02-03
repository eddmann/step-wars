/**
 * Timezone-aware date utilities for consistent date handling
 * across the application.
 */

/**
 * Get the current date in YYYY-MM-DD format for a given timezone.
 */
export function getDateInTimezone(timezone: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * Get the current date and hour in a given timezone.
 * Returns { date: "YYYY-MM-DD", hour: 0-23 }
 */
export function getDateTimeInTimezone(
  timezone: string,
  now: Date = new Date()
): { date: string; hour: number } {
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false
  });
  return {
    date: dateFormatter.format(now),
    hour: parseInt(hourFormatter.format(now), 10)
  };
}

/**
 * Get yesterday's date in YYYY-MM-DD format for a given timezone.
 * Correctly calculates "yesterday" within the target timezone.
 */
export function getYesterdayInTimezone(timezone: string, now: Date = new Date()): string {
  const today = getDateInTimezone(timezone, now);
  // Parse and subtract 1 day
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  // Format back to YYYY-MM-DD
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
