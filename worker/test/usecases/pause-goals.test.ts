import { describe, test, expect } from "bun:test";
import { pauseGoals } from "../../usecases/pause-goals.usecase";
import { createTestStore } from "../setup";
import { createMemoryRepos } from "../memory";

describe("pauseGoals", () => {
  test("pauses goals", async () => {
    const store = createTestStore();
    const { goalsRepository } = createMemoryRepos(store);

    const result = await pauseGoals({ goalsRepository }, { userId: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goals.is_paused).toBe(true);
    }
  });
});
