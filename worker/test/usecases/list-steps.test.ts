import { describe, test, expect, beforeEach } from "bun:test";
import { listSteps } from "../../usecases/list-steps.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createStepEntry, resetAllFixtureCounters } from "../fixtures";

describe("listSteps", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("lists user entries in descending date order", async () => {
    const store = createTestStore();
    const entries = [
      createStepEntry({
        user_id: 1,
        date: "2026-01-01",
        step_count: 1000,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-03",
        step_count: 3000,
      }),
      createStepEntry({
        user_id: 1,
        date: "2026-01-02",
        step_count: 2000,
      }),
    ];
    seedTestStore(store, { stepEntries: entries });

    const { stepEntryRepository } = createMemoryRepos(store);
    const result = await listSteps({ stepEntryRepository }, { userId: 1 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].date).toBe("2026-01-03");
      expect(result.value).toHaveLength(3);
    }
  });
});
