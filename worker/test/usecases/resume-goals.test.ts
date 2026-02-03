import { describe, test, expect } from "bun:test";
import { resumeGoals } from "../../usecases/resume-goals.usecase";
import { createTestStore } from "../setup";
import { createMemoryRepos } from "../memory";

describe("resumeGoals", () => {
  test("resumes goals", async () => {
    const store = createTestStore();
    const { goalsRepository } = createMemoryRepos(store);

    const result = await resumeGoals({ goalsRepository }, { userId: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.goals.is_paused).toBe(false);
    }
  });
});
