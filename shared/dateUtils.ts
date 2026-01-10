/**
 * Timezone-aware date utilities for consistent date handling
 * across the application.
 */

/**
 * Get the current date in YYYY-MM-DD format for a given timezone.
 */
export function getDateInTimezone(timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

/**
 * Get the current date and hour in a given timezone.
 * Returns { date: "YYYY-MM-DD", hour: 0-23 }
 */
export function getDateTimeInTimezone(timezone: string): { date: string; hour: number } {
  const now = new Date();
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
 */
export function getYesterdayInTimezone(timezone: string): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(yesterday);
}
