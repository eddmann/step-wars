// User
export interface User {
  id: number;
  email: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithToken extends User {
  token: string;
}

// Challenge
export type ChallengeMode = "daily_winner" | "cumulative";
export type ChallengeStatus = "pending" | "active" | "completed";
export type RecurringInterval = "weekly" | "monthly" | null;

export interface Challenge {
  id: number;
  title: string;
  description: string | null;
  creator_id: number;
  start_date: string;
  end_date: string;
  mode: ChallengeMode;
  invite_code: string;
  status: ChallengeStatus;
  is_recurring: boolean;
  recurring_interval: RecurringInterval;
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithParticipants extends Challenge {
  participants: Participant[];
  participant_count: number;
}

export interface Participant {
  id: number;
  user_id: number;
  name: string;
  joined_at: string;
}

// Step Entry (global - one entry per user per day)
export type StepSource = "manual" | "healthkit" | "google_fit" | "garmin" | "strava";

export interface StepEntry {
  id: number;
  user_id: number;
  date: string;
  step_count: number;
  source: StepSource;
  created_at: string;
  updated_at: string;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  total_steps: number;
  total_points: number; // For daily_winner mode
  today_steps: number | null; // null for other users (hidden during edit window)
  is_current_user: boolean;
  has_pending_steps?: boolean; // true if user has steps in the edit window (not visible to others)
}

// Goals
export interface UserGoals {
  id: number;
  user_id: number;
  daily_target: number;
  weekly_target: number;
  is_paused: boolean;
  paused_at: string | null;
  current_streak: number;
  longest_streak: number;
  last_achieved_date: string | null;
  created_at: string;
  updated_at: string;
}

// Badges
export type BadgeType =
  | "daily_winner"
  | "challenge_winner"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "streak_60"
  | "streak_100";

export interface Badge {
  id: number;
  user_id: number;
  badge_type: BadgeType;
  challenge_id: number | null;
  earned_at: string;
}

// Notifications
export type NotificationType = "badge_earned" | "daily_win" | "challenge_won";

export interface PendingNotification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  badge_type: string | null;
  challenge_id: number | null;
  created_at: string;
  read_at: string | null;
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: string[];
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  timezone: string;
}

export interface CreateChallengeForm {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  mode: ChallengeMode;
  is_recurring: boolean;
  recurring_interval: RecurringInterval;
}

export interface StepEntryForm {
  date: string;
  step_count: string; // String for form input
}

export interface GoalsForm {
  daily_target: string;
  weekly_target: string;
}
