// Edit window: can log/edit steps until noon the next day
export const EDIT_DEADLINE_HOUR = 12; // noon

// Default goals
export const DEFAULT_DAILY_GOAL = 10000;
export const DEFAULT_WEEKLY_GOAL = 70000;

// Step limits (reasonable bounds)
export const MIN_STEPS = 0;
export const MAX_STEPS = 100000; // ~40 miles, reasonable max

// Invite code settings
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No ambiguous chars

// Points for daily winner mode
export const DAILY_WINNER_POINTS = {
  FIRST: 3,
  SECOND: 2,
  THIRD: 1,
};

// Streak badge milestones
export const STREAK_MILESTONES = [7, 14, 30, 50, 100];

// Marathon Day badge threshold
export const MARATHON_DAY_STEPS = 20000;

// Reaction types
export const REACTION_TYPES = [
  "fire",
  "clap",
  "wow",
  "strong",
  "laugh",
  "trophy",
  "lazy",
  "eyes",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  fire: "\u{1F525}",
  clap: "\u{1F44F}",
  wow: "\u{1F632}",
  strong: "\u{1F4AA}",
  laugh: "\u{1F602}",
  trophy: "\u{1F3C6}",
  lazy: "\u{1F4A4}",
  eyes: "\u{1F440}",
};

// Utility functions
export function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length])
    .join("");
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
