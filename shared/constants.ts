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
export const STREAK_MILESTONES = [7, 14, 30, 60, 100];
