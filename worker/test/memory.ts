import type { TestStore } from "./setup";
import { createMemoryUserRepository } from "../repositories/memory/user.memory";
import { createMemorySessionRepository } from "../repositories/memory/session.memory";
import { createMemoryChallengeRepository } from "../repositories/memory/challenge.memory";
import { createMemoryParticipantRepository } from "../repositories/memory/participant.memory";
import { createMemoryStepEntryRepository } from "../repositories/memory/step-entry.memory";
import { createMemoryDailyPointsRepository } from "../repositories/memory/daily-points.memory";
import { createMemoryLeaderboardRepository } from "../repositories/memory/leaderboard.memory";
import { createMemoryGoalsRepository } from "../repositories/memory/goals.memory";
import { createMemoryBadgeRepository } from "../repositories/memory/badge.memory";
import { createMemoryStatsRepository } from "../repositories/memory/stats.memory";
import { createMemoryNotificationRepository } from "../repositories/memory/notification.memory";

export function createMemoryRepos(store: TestStore) {
  return {
    userRepository: createMemoryUserRepository(store),
    sessionRepository: createMemorySessionRepository(store),
    challengeRepository: createMemoryChallengeRepository(store),
    participantRepository: createMemoryParticipantRepository(store),
    stepEntryRepository: createMemoryStepEntryRepository(store),
    dailyPointsRepository: createMemoryDailyPointsRepository(store),
    leaderboardRepository: createMemoryLeaderboardRepository(store),
    goalsRepository: createMemoryGoalsRepository(store),
    badgeRepository: createMemoryBadgeRepository(store),
    statsRepository: createMemoryStatsRepository(store),
    notificationRepository: createMemoryNotificationRepository(store),
  };
}
