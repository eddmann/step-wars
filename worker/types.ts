export interface Env {
  DB: import("@cloudflare/workers-types").D1Database;
  ASSETS?: import("@cloudflare/workers-types").Fetcher;
  ENVIRONMENT?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string | null;
  creator_id: number;
  start_date: string;
  end_date: string;
  mode: "daily_winner" | "cumulative";
  invite_code: string;
  status: "pending" | "active" | "completed";
  timezone: string;
  is_recurring: number;
  recurring_interval: "weekly" | "monthly" | null;
  created_at: string;
  updated_at: string;
}

export interface ChallengeParticipant {
  id: number;
  challenge_id: number;
  user_id: number;
  joined_at: string;
}

export interface StepEntry {
  id: number;
  user_id: number;
  date: string;
  step_count: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface DailyPoints {
  id: number;
  challenge_id: number;
  user_id: number;
  date: string;
  points: number;
}

export interface UserGoals {
  id: number;
  user_id: number;
  daily_target: number;
  weekly_target: number;
  is_paused: number;
  paused_at: string | null;
  current_streak: number;
  longest_streak: number;
  last_achieved_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_type: string;
  challenge_id: number | null;
  earned_at: string;
}

export interface PendingNotification {
  id: number;
  user_id: number;
  type: "badge_earned" | "daily_win" | "challenge_won";
  title: string;
  message: string;
  badge_type: string | null;
  challenge_id: number | null;
  created_at: string;
  read_at: string | null;
}
