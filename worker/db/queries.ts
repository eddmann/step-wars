import type { Env, User, Challenge, StepEntry, UserGoals, UserBadge, PendingNotification } from "../types";
import { INVITE_CODE_LENGTH, INVITE_CODE_CHARS } from "../../shared/constants";

// User queries
export async function createUser(
  env: Env,
  email: string,
  name: string,
  passwordHash: string,
  timezone: string
): Promise<User> {
  const result = await env.DB.prepare(
    `INSERT INTO users (email, name, password_hash, timezone)
     VALUES (?, ?, ?, ?)
     RETURNING *`
  )
    .bind(email, name, passwordHash, timezone)
    .first<User>();
  return result!;
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  return await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<User>();
}

export async function getUserById(env: Env, id: number): Promise<User | null> {
  return await env.DB.prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<User>();
}

export async function updateUser(
  env: Env,
  id: number,
  name: string,
  email: string,
  timezone?: string
): Promise<User | null> {
  if (timezone) {
    return await env.DB.prepare(
      `UPDATE users SET name = ?, email = ?, timezone = ?, updated_at = datetime('now')
       WHERE id = ? RETURNING *`
    )
      .bind(name, email, timezone, id)
      .first<User>();
  }
  return await env.DB.prepare(
    `UPDATE users SET name = ?, email = ?, updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  )
    .bind(name, email, id)
    .first<User>();
}

// Session queries
export async function createSession(
  env: Env,
  userId: number,
  token: string
): Promise<void> {
  // Sessions expire in 30 days
  await env.DB.prepare(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES (?, ?, datetime('now', '+30 days'))`
  )
    .bind(userId, token)
    .run();
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

// Challenge queries
function generateInviteCode(): string {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => INVITE_CODE_CHARS[b % INVITE_CODE_CHARS.length])
    .join("");
}

export async function createChallenge(
  env: Env,
  creatorId: number,
  title: string,
  description: string | null,
  startDate: string,
  endDate: string,
  mode: "daily_winner" | "cumulative",
  timezone: string,
  isRecurring: boolean,
  recurringInterval: "weekly" | "monthly" | null
): Promise<Challenge> {
  const inviteCode = generateInviteCode();

  const result = await env.DB.prepare(
    `INSERT INTO challenges (title, description, creator_id, start_date, end_date, mode, invite_code, timezone, is_recurring, recurring_interval)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`
  )
    .bind(
      title,
      description,
      creatorId,
      startDate,
      endDate,
      mode,
      inviteCode,
      timezone,
      isRecurring ? 1 : 0,
      recurringInterval
    )
    .first<Challenge>();

  // Auto-join creator to challenge
  await env.DB.prepare(
    `INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)`
  )
    .bind(result!.id, creatorId)
    .run();

  return result!;
}

export async function getChallengeById(
  env: Env,
  id: number
): Promise<Challenge | null> {
  return await env.DB.prepare("SELECT * FROM challenges WHERE id = ?")
    .bind(id)
    .first<Challenge>();
}

export async function getChallengeByInviteCode(
  env: Env,
  inviteCode: string
): Promise<Challenge | null> {
  return await env.DB.prepare("SELECT * FROM challenges WHERE invite_code = ?")
    .bind(inviteCode.toUpperCase())
    .first<Challenge>();
}

export async function getUserChallenges(
  env: Env,
  userId: number
): Promise<(Challenge & { participant_count: number })[]> {
  const result = await env.DB.prepare(
    `SELECT c.*,
            (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count
     FROM challenges c
     INNER JOIN challenge_participants cp ON c.id = cp.challenge_id
     WHERE cp.user_id = ?
     ORDER BY c.start_date DESC`
  )
    .bind(userId)
    .all<Challenge & { participant_count: number }>();
  return result.results;
}

export async function joinChallenge(
  env: Env,
  challengeId: number,
  userId: number
): Promise<boolean> {
  try {
    await env.DB.prepare(
      `INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)`
    )
      .bind(challengeId, userId)
      .run();
    return true;
  } catch {
    // Already a participant
    return false;
  }
}

export async function isParticipant(
  env: Env,
  challengeId: number,
  userId: number
): Promise<boolean> {
  const result = await env.DB.prepare(
    `SELECT 1 FROM challenge_participants WHERE challenge_id = ? AND user_id = ?`
  )
    .bind(challengeId, userId)
    .first();
  return result !== null;
}

export async function getChallengeParticipants(
  env: Env,
  challengeId: number
): Promise<{ user_id: number; name: string; joined_at: string }[]> {
  const result = await env.DB.prepare(
    `SELECT u.id as user_id, u.name, cp.joined_at
     FROM challenge_participants cp
     INNER JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = ?
     ORDER BY cp.joined_at`
  )
    .bind(challengeId)
    .all<{ user_id: number; name: string; joined_at: string }>();
  return result.results;
}

// Step entry queries (global - one entry per user per day)
export async function getStepEntry(
  env: Env,
  userId: number,
  date: string
): Promise<StepEntry | null> {
  return await env.DB.prepare(
    `SELECT * FROM step_entries WHERE user_id = ? AND date = ?`
  )
    .bind(userId, date)
    .first<StepEntry>();
}

export async function upsertStepEntry(
  env: Env,
  userId: number,
  date: string,
  stepCount: number,
  source: string = "manual"
): Promise<StepEntry> {
  const result = await env.DB.prepare(
    `INSERT INTO step_entries (user_id, date, step_count, source)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, date)
     DO UPDATE SET step_count = excluded.step_count, source = excluded.source, updated_at = datetime('now')
     RETURNING *`
  )
    .bind(userId, date, stepCount, source)
    .first<StepEntry>();
  return result!;
}

export async function getUserEntries(
  env: Env,
  userId: number
): Promise<StepEntry[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM step_entries WHERE user_id = ? ORDER BY date DESC`
  )
    .bind(userId)
    .all<StepEntry>();
  return result.results;
}

export async function getRecentStepEntries(
  env: Env,
  userId: number,
  limit: number
): Promise<StepEntry[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM step_entries WHERE user_id = ? ORDER BY date DESC LIMIT ?`
  )
    .bind(userId, limit)
    .all<StepEntry>();
  return result.results;
}

export async function getTodaySteps(
  env: Env,
  userId: number,
  date: string
): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT COALESCE(step_count, 0) as total
     FROM step_entries
     WHERE user_id = ? AND date = ?`
  )
    .bind(userId, date)
    .first<{ total: number }>();
  return result?.total || 0;
}

// Leaderboard queries
// Returns leaderboard with two step counts:
// - confirmed_steps: steps from dates before the edit cutoff (visible to all)
// - pending_steps: steps from dates on/after the edit cutoff (only visible to the user themselves)
// Now uses challenge date range instead of challenge_id since step entries are global
export async function getChallengeLeaderboard(
  env: Env,
  challengeId: number,
  challengeStartDate: string,
  challengeEndDate: string,
  today: string,
  editCutoffDate: string // Entries on or after this date are still editable
): Promise<
  {
    user_id: number;
    name: string;
    confirmed_steps: number;
    pending_steps: number;
    total_points: number;
    today_steps: number;
  }[]
> {
  const result = await env.DB.prepare(
    `SELECT
       u.id as user_id,
       u.name,
       COALESCE((
         SELECT SUM(step_count) FROM step_entries
         WHERE user_id = u.id
           AND date >= ? AND date <= ?
           AND date < ?
       ), 0) as confirmed_steps,
       COALESCE((
         SELECT SUM(step_count) FROM step_entries
         WHERE user_id = u.id
           AND date >= ? AND date <= ?
           AND date >= ?
       ), 0) as pending_steps,
       COALESCE((SELECT SUM(points) FROM daily_points WHERE challenge_id = ? AND user_id = u.id), 0) as total_points,
       COALESCE((SELECT step_count FROM step_entries WHERE user_id = u.id AND date = ?), 0) as today_steps
     FROM challenge_participants cp
     INNER JOIN users u ON cp.user_id = u.id
     WHERE cp.challenge_id = ?
     GROUP BY u.id, u.name
     ORDER BY confirmed_steps DESC`
  )
    .bind(
      challengeStartDate, challengeEndDate, editCutoffDate,  // confirmed_steps
      challengeStartDate, challengeEndDate, editCutoffDate,  // pending_steps
      challengeId,                                            // total_points
      today,                                                  // today_steps
      challengeId                                             // WHERE
    )
    .all<{
      user_id: number;
      name: string;
      confirmed_steps: number;
      pending_steps: number;
      total_points: number;
      today_steps: number;
    }>();
  return result.results;
}

// Goals queries
export async function getOrCreateUserGoals(
  env: Env,
  userId: number
): Promise<UserGoals> {
  let goals = await env.DB.prepare(
    "SELECT * FROM user_goals WHERE user_id = ?"
  )
    .bind(userId)
    .first<UserGoals>();

  if (!goals) {
    goals = await env.DB.prepare(
      `INSERT INTO user_goals (user_id) VALUES (?) RETURNING *`
    )
      .bind(userId)
      .first<UserGoals>();
  }

  return goals!;
}

export async function updateUserGoals(
  env: Env,
  userId: number,
  dailyTarget: number,
  weeklyTarget: number
): Promise<UserGoals> {
  const result = await env.DB.prepare(
    `UPDATE user_goals
     SET daily_target = ?, weekly_target = ?, updated_at = datetime('now')
     WHERE user_id = ?
     RETURNING *`
  )
    .bind(dailyTarget, weeklyTarget, userId)
    .first<UserGoals>();
  return result!;
}

export async function toggleGoalsPause(
  env: Env,
  userId: number,
  isPaused: boolean
): Promise<UserGoals> {
  const result = await env.DB.prepare(
    `UPDATE user_goals
     SET is_paused = ?, paused_at = ?, updated_at = datetime('now')
     WHERE user_id = ?
     RETURNING *`
  )
    .bind(isPaused ? 1 : 0, isPaused ? new Date().toISOString() : null, userId)
    .first<UserGoals>();
  return result!;
}

export async function updateStreak(
  env: Env,
  userId: number,
  currentStreak: number,
  longestStreak: number,
  lastAchievedDate: string | null
): Promise<void> {
  await env.DB.prepare(
    `UPDATE user_goals
     SET current_streak = ?, longest_streak = ?, last_achieved_date = ?, updated_at = datetime('now')
     WHERE user_id = ?`
  )
    .bind(currentStreak, longestStreak, lastAchievedDate, userId)
    .run();
}

// Badge queries
export async function getUserBadges(env: Env, userId: number): Promise<UserBadge[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC"
  )
    .bind(userId)
    .all<UserBadge>();
  return result.results;
}

export async function awardBadge(
  env: Env,
  userId: number,
  badgeType: string,
  challengeId: number | null = null
): Promise<UserBadge | null> {
  try {
    const result = await env.DB.prepare(
      `INSERT INTO user_badges (user_id, badge_type, challenge_id)
       VALUES (?, ?, ?)
       RETURNING *`
    )
      .bind(userId, badgeType, challengeId)
      .first<UserBadge>();
    return result;
  } catch {
    // Badge already exists
    return null;
  }
}

// Stats queries
export async function getUserStats(
  env: Env,
  userId: number
): Promise<{
  total_steps: number;
  challenges_joined: number;
  challenges_won: number;
  badges_earned: number;
}> {
  const result = await env.DB.prepare(
    `SELECT
       COALESCE((SELECT SUM(step_count) FROM step_entries WHERE user_id = ?), 0) as total_steps,
       (SELECT COUNT(*) FROM challenge_participants WHERE user_id = ?) as challenges_joined,
       (SELECT COUNT(*) FROM user_badges WHERE user_id = ? AND badge_type = 'challenge_winner') as challenges_won,
       (SELECT COUNT(*) FROM user_badges WHERE user_id = ?) as badges_earned`
  )
    .bind(userId, userId, userId, userId)
    .first<{
      total_steps: number;
      challenges_joined: number;
      challenges_won: number;
      badges_earned: number;
    }>();
  return result!;
}

// Notification queries
export async function getPendingNotifications(
  env: Env,
  userId: number
): Promise<PendingNotification[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM pending_notifications
     WHERE user_id = ? AND read_at IS NULL
     ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<PendingNotification>();
  return result.results;
}

export async function markNotificationsAsRead(
  env: Env,
  userId: number,
  notificationIds: number[]
): Promise<void> {
  if (notificationIds.length === 0) return;

  // Build a parameterized query for the IN clause
  // Also filter by user_id to prevent marking other users' notifications
  const placeholders = notificationIds.map(() => "?").join(",");
  await env.DB.prepare(
    `UPDATE pending_notifications
     SET read_at = datetime('now')
     WHERE id IN (${placeholders}) AND user_id = ?`
  )
    .bind(...notificationIds, userId)
    .run();
}
