import { describe, test, expect } from "bun:test";
import { createChallenge } from "../../usecases/create-challenge.usecase";
import { createTestStore } from "../setup";
import { createMemoryRepos } from "../memory";

describe("createChallenge", () => {
  test("creates challenge and auto-joins creator", async () => {
    const store = createTestStore();
    const { challengeRepository, participantRepository } =
      createMemoryRepos(store);

    const result = await createChallenge(
      { challengeRepository, participantRepository },
      {
        creatorId: 1,
        title: "Test Challenge",
        description: null,
        startDate: "2026-01-01",
        endDate: "2026-01-07",
        mode: "daily_winner",
        timezone: "UTC",
        isRecurring: false,
        recurringInterval: null,
      },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Test Challenge");
    }
    expect(store.challenges).toHaveLength(1);
    expect(store.participants).toHaveLength(1);
    expect(store.participants[0].user_id).toBe(1);
  });
});
