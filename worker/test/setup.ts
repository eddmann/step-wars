import type {
  User,
  Session,
  Challenge,
  ChallengeParticipant,
  StepEntry,
  DailyPoints,
  UserGoals,
  UserBadge,
  PendingNotification,
} from "../types";

export interface TestStore {
  users: User[];
  sessions: Session[];
  challenges: Challenge[];
  participants: ChallengeParticipant[];
  stepEntries: StepEntry[];
  dailyPoints: DailyPoints[];
  userGoals: UserGoals[];
  userBadges: UserBadge[];
  notifications: PendingNotification[];
}

export function createTestStore(): TestStore {
  return {
    users: [],
    sessions: [],
    challenges: [],
    participants: [],
    stepEntries: [],
    dailyPoints: [],
    userGoals: [],
    userBadges: [],
    notifications: [],
  };
}

export function seedTestStore(
  store: TestStore,
  data: Partial<TestStore>,
): void {
  if (data.users) store.users.push(...data.users);
  if (data.sessions) store.sessions.push(...data.sessions);
  if (data.challenges) store.challenges.push(...data.challenges);
  if (data.participants) store.participants.push(...data.participants);
  if (data.stepEntries) store.stepEntries.push(...data.stepEntries);
  if (data.dailyPoints) store.dailyPoints.push(...data.dailyPoints);
  if (data.userGoals) store.userGoals.push(...data.userGoals);
  if (data.userBadges) store.userBadges.push(...data.userBadges);
  if (data.notifications) store.notifications.push(...data.notifications);
}
