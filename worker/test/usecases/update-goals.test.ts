import { describe, test, expect } from "bun:test";
import { updateGoals } from "../../usecases/update-goals.usecase";
import { createTestStore } from "../setup";
import { createMemoryRepos } from "../memory";

describe("updateGoals", () => {
  test("updates goals targets", async () => {
    const store = createTestStore();
    const { goalsRepository } = createMemoryRepos(store);

    const result = await updateGoals(
      { goalsRepository },
      { userId: 1, dailyTarget: 12000, weeklyTarget: 80000 },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goals.daily_target).toBe(12000);
      expect(result.value.goals.weekly_target).toBe(80000);
    }
  });
});
