export * from "./user.fixture";
export * from "./session.fixture";
export * from "./challenge.fixture";
export * from "./participant.fixture";
export * from "./step-entry.fixture";
export * from "./daily-points.fixture";
export * from "./goals.fixture";
export * from "./badge.fixture";
export * from "./notification.fixture";

import { resetUserIdCounter } from "./user.fixture";
import { resetSessionIdCounter } from "./session.fixture";
import { resetChallengeIdCounter } from "./challenge.fixture";
import { resetParticipantIdCounter } from "./participant.fixture";
import { resetStepEntryIdCounter } from "./step-entry.fixture";
import { resetDailyPointsIdCounter } from "./daily-points.fixture";
import { resetGoalsIdCounter } from "./goals.fixture";
import { resetBadgeIdCounter } from "./badge.fixture";
import { resetNotificationIdCounter } from "./notification.fixture";

export function resetAllFixtureCounters(): void {
  resetUserIdCounter();
  resetSessionIdCounter();
  resetChallengeIdCounter();
  resetParticipantIdCounter();
  resetStepEntryIdCounter();
  resetDailyPointsIdCounter();
  resetGoalsIdCounter();
  resetBadgeIdCounter();
  resetNotificationIdCounter();
}
