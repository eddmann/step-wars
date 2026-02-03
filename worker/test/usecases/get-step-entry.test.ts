import { describe, test, expect, beforeEach } from "bun:test";
import { getStepEntry } from "../../usecases/get-step-entry.usecase";
import { createTestStore, seedTestStore } from "../setup";
import { createMemoryRepos } from "../memory";
import { createStepEntry, resetAllFixtureCounters } from "../fixtures";

describe("getStepEntry", () => {
  beforeEach(() => {
    resetAllFixtureCounters();
  });

  test("returns entry for date", async () => {
    const store = createTestStore();
    const entry = createStepEntry({ user_id: 1, date: "2026-01-01" });
    seedTestStore(store, { stepEntries: [entry] });

    const { stepEntryRepository } = createMemoryRepos(store);
    const result = await getStepEntry(
      { stepEntryRepository },
      { userId: 1, date: "2026-01-01" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.date).toBe("2026-01-01");
    }
  });

  test("returns null when no entry", async () => {
    const store = createTestStore();
    const { stepEntryRepository } = createMemoryRepos(store);

    const result = await getStepEntry(
      { stepEntryRepository },
      { userId: 1, date: "2026-01-01" },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});
