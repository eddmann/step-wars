import type { Result } from "../utils/result";
import { ok } from "../utils/result";
import type { UseCaseError } from "./errors";
import type { ChallengeLifecycleDeps } from "../services/challenge-lifecycle.service";
import {
  activatePendingChallenges,
  calculateDailyPoints,
  finalizeChallenges,
} from "../services/challenge-lifecycle.service";

export async function runCron(
  deps: ChallengeLifecycleDeps,
): Promise<Result<{ success: true }, UseCaseError>> {
  await activatePendingChallenges(deps);
  await calculateDailyPoints(deps);
  await finalizeChallenges(deps);
  return ok({ success: true });
}
