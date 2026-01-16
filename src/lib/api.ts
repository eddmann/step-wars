import type {
  ApiResponse,
  User,
  Challenge,
  Participant,
  LeaderboardEntry,
  StepEntry,
  UserGoals,
  Badge,
  PendingNotification,
  LoginForm,
  RegisterForm,
  CreateChallengeForm,
  DaySummary,
} from "../types";

const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("step_wars_token");
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "An error occurred" };
    }

    return data;
  } catch (error) {
    return { error: "Network error. Please try again." };
  }
}

// Auth
export async function login(
  credentials: LoginForm
): Promise<ApiResponse<{ user: User; token: string }>> {
  return fetchApi("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export async function register(
  data: RegisterForm
): Promise<ApiResponse<{ user: User; token: string }>> {
  return fetchApi("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi("/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
  return fetchApi("/auth/me");
}

// Challenges
export async function getChallenges(): Promise<
  ApiResponse<{ challenges: (Challenge & { participant_count: number })[] }>
> {
  return fetchApi("/challenges");
}

export async function getChallenge(id: number): Promise<
  ApiResponse<{
    challenge: Challenge;
    participants: Participant[];
    participant_count: number;
  }>
> {
  return fetchApi(`/challenges/${id}`);
}

export async function createChallenge(
  data: CreateChallengeForm
): Promise<ApiResponse<{ challenge: Challenge }>> {
  return fetchApi("/challenges", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function joinChallenge(
  inviteCode: string
): Promise<ApiResponse<{ challenge: Challenge }>> {
  return fetchApi("/challenges/join", {
    method: "POST",
    body: JSON.stringify({ invite_code: inviteCode }),
  });
}

// Leaderboard
export async function getLeaderboard(challengeId: number): Promise<
  ApiResponse<{
    challenge_id: number;
    mode: string;
    leaderboard: LeaderboardEntry[];
    last_finalized_date: string;
  }>
> {
  return fetchApi(`/challenges/${challengeId}/leaderboard`);
}

// Daily Breakdown (for all challenge modes)
export async function getDailyBreakdown(challengeId: number): Promise<
  ApiResponse<{
    challenge_id: number;
    challenge_title: string;
    mode: string;
    days: DaySummary[];
  }>
> {
  return fetchApi(`/challenges/${challengeId}/daily-breakdown`);
}

// Steps (global step entry)
export async function getSteps(): Promise<ApiResponse<{ entries: StepEntry[] }>> {
  return fetchApi("/steps");
}

export async function submitSteps(
  date: string,
  stepCount: number,
  source: string = "manual"
): Promise<ApiResponse<{ entry: StepEntry }>> {
  return fetchApi("/steps", {
    method: "POST",
    body: JSON.stringify({ date, step_count: stepCount, source }),
  });
}

export async function getStepsForDate(
  date: string
): Promise<ApiResponse<{ entry: StepEntry | null }>> {
  return fetchApi(`/steps/${date}`);
}

// Goals
export async function getGoals(): Promise<
  ApiResponse<{
    goals: UserGoals;
    today_steps: number;
    weekly_steps: number;
    daily_progress: number;
    weekly_progress: number;
    notifications: PendingNotification[];
  }>
> {
  return fetchApi("/goals");
}

export async function markNotificationsAsRead(
  notificationIds: number[]
): Promise<ApiResponse<{ success: boolean }>> {
  return fetchApi("/goals/notifications/read", {
    method: "POST",
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
}

export async function updateGoals(
  dailyTarget: number,
  weeklyTarget: number
): Promise<ApiResponse<{ goals: UserGoals }>> {
  return fetchApi("/goals", {
    method: "PUT",
    body: JSON.stringify({ daily_target: dailyTarget, weekly_target: weeklyTarget }),
  });
}

export async function pauseGoals(): Promise<ApiResponse<{ goals: UserGoals }>> {
  return fetchApi("/goals/pause", { method: "POST" });
}

export async function resumeGoals(): Promise<ApiResponse<{ goals: UserGoals }>> {
  return fetchApi("/goals/resume", { method: "POST" });
}

// Profile
export async function getProfile(): Promise<
  ApiResponse<{
    user: User;
    stats: {
      total_steps: number;
      challenges_joined: number;
      challenges_won: number;
      badges_earned: number;
      today_steps: number;
    };
    badges: Badge[];
  }>
> {
  return fetchApi("/profile");
}

export async function updateProfile(
  name: string,
  email: string,
  timezone?: string
): Promise<ApiResponse<{ user: User }>> {
  return fetchApi("/profile", {
    method: "PUT",
    body: JSON.stringify({ name, email, timezone }),
  });
}
