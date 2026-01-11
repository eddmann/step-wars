import { describe, it, expect, beforeAll } from "vitest";
import {
  createTestUser,
  apiRequest,
  insertTestSteps,
  runCron,
  getDaysAgo,
  type TestUser,
} from "../helpers";

/**
 * Full journey integration test:
 * 1. Two users sign up
 * 2. User 1 creates a challenge (with past dates)
 * 3. User 2 joins via invite code
 * 4. Both users log steps for multiple days
 * 5. Cron runs to calculate daily points
 * 6. Cron runs again to finalize the challenge
 * 7. Verify winner is determined correctly
 */
describe("Full Journey", () => {
  let user1: TestUser;
  let user2: TestUser;
  let challengeId: number;
  let inviteCode: string;

  // Challenge runs from 5 days ago to 2 days ago (3 day challenge)
  const startDate = getDaysAgo(5);
  const endDate = getDaysAgo(2);
  const day1 = getDaysAgo(5); // First day of challenge
  const day2 = getDaysAgo(4); // Second day
  const day3 = getDaysAgo(3); // Third day (last day)

  beforeAll(async () => {
    // Create two test users
    user1 = await createTestUser(
      `journey-alice-${Date.now()}@example.com`,
      "password123",
      "Alice"
    );
    user2 = await createTestUser(
      `journey-bob-${Date.now()}@example.com`,
      "password123",
      "Bob"
    );
  });

  it("should complete a full challenge journey with daily_winner mode", async () => {
    // Step 1: User 1 creates a challenge
    const createResponse = await apiRequest("POST", "/challenges", user1.token, {
      title: "Journey Test Challenge",
      description: "A full journey test",
      start_date: startDate,
      end_date: endDate,
      mode: "daily_winner",
    });

    expect(createResponse.ok).toBe(true);
    const createJson = await createResponse.json();
    challengeId = createJson.data.challenge.id;
    inviteCode = createJson.data.challenge.invite_code;
    expect(challengeId).toBeDefined();
    expect(inviteCode).toBeDefined();

    // Step 2: User 2 joins via invite code
    const joinResponse = await apiRequest("POST", "/challenges/join", user2.token, {
      invite_code: inviteCode,
    });

    expect(joinResponse.ok).toBe(true);
    const joinJson = await joinResponse.json();
    expect(joinJson.data.challenge.id).toBe(challengeId);

    // Step 3: Both users log steps for 3 days
    // Day 1: Alice wins (10000 > 8000)
    // Day 2: Bob wins (12000 > 9000)
    // Day 3: Alice wins (15000 > 11000)
    // Expected: Alice gets 3+2+3=8 points, Bob gets 2+3+2=7 points
    // Alice should win overall

    // Day 1 steps
    const day1Alice = await insertTestSteps(user1.token, day1, 10000);
    expect(day1Alice.ok).toBe(true);
    const day1Bob = await insertTestSteps(user2.token, day1, 8000);
    expect(day1Bob.ok).toBe(true);

    // Day 2 steps
    const day2Alice = await insertTestSteps(user1.token, day2, 9000);
    expect(day2Alice.ok).toBe(true);
    const day2Bob = await insertTestSteps(user2.token, day2, 12000);
    expect(day2Bob.ok).toBe(true);

    // Day 3 steps
    const day3Alice = await insertTestSteps(user1.token, day3, 15000);
    expect(day3Alice.ok).toBe(true);
    const day3Bob = await insertTestSteps(user2.token, day3, 11000);
    expect(day3Bob.ok).toBe(true);

    // Step 4: Run cron to calculate daily points and finalize
    const cronResponse = await runCron();
    expect(cronResponse.ok).toBe(true);
    const cronJson = await cronResponse.json();
    expect(cronJson.data.success).toBe(true);

    // Step 5: Verify challenge is finalized
    const challengeResponse = await apiRequest(
      "GET",
      `/challenges/${challengeId}`,
      user1.token
    );
    expect(challengeResponse.ok).toBe(true);
    const challengeJson = await challengeResponse.json();
    expect(challengeJson.data.challenge.status).toBe("completed");

    // Step 6: Verify leaderboard shows correct standings
    const leaderboardResponse = await apiRequest(
      "GET",
      `/challenges/${challengeId}/leaderboard`,
      user1.token
    );
    expect(leaderboardResponse.ok).toBe(true);
    const leaderboardJson = await leaderboardResponse.json();
    const leaderboard = leaderboardJson.data.leaderboard;

    // Alice should be first with 8 points (3+2+3)
    // Bob should be second with 7 points (2+3+2)
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].name).toBe("Alice");
    expect(leaderboard[0].total_points).toBe(8);
    expect(leaderboard[1].name).toBe("Bob");
    expect(leaderboard[1].total_points).toBe(7);
  });

  it("should complete a full challenge journey with cumulative mode", async () => {
    // Create a cumulative challenge
    const createResponse = await apiRequest("POST", "/challenges", user1.token, {
      title: "Cumulative Test Challenge",
      description: "A cumulative mode test",
      start_date: startDate,
      end_date: endDate,
      mode: "cumulative",
    });

    expect(createResponse.ok).toBe(true);
    const createJson = await createResponse.json();
    const cumulativeChallengeId = createJson.data.challenge.id;
    const cumulativeInviteCode = createJson.data.challenge.invite_code;

    // User 2 joins
    const joinResponse = await apiRequest("POST", "/challenges/join", user2.token, {
      invite_code: cumulativeInviteCode,
    });
    expect(joinResponse.ok).toBe(true);

    // Both users already have steps logged from the previous test
    // Alice: 10000 + 9000 + 15000 = 34000 steps
    // Bob: 8000 + 12000 + 11000 = 31000 steps
    // Alice should win based on total steps

    // Run cron to finalize
    const cronResponse = await runCron();
    expect(cronResponse.ok).toBe(true);

    // Verify challenge is finalized
    const challengeResponse = await apiRequest(
      "GET",
      `/challenges/${cumulativeChallengeId}`,
      user1.token
    );
    expect(challengeResponse.ok).toBe(true);
    const challengeJson = await challengeResponse.json();
    expect(challengeJson.data.challenge.status).toBe("completed");

    // Verify leaderboard shows correct standings
    const leaderboardResponse = await apiRequest(
      "GET",
      `/challenges/${cumulativeChallengeId}/leaderboard`,
      user1.token
    );
    expect(leaderboardResponse.ok).toBe(true);
    const leaderboardJson = await leaderboardResponse.json();
    const leaderboard = leaderboardJson.data.leaderboard;

    // Alice should be first with more total steps
    // Note: leaderboard may show confirmed vs pending steps differently
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].name).toBe("Alice");
    expect(leaderboard[0].total_steps).toBe(34000);
    expect(leaderboard[1].name).toBe("Bob");
    expect(leaderboard[1].total_steps).toBe(31000);
  });

  it("should award badges to winners", async () => {
    // Check user 1 (Alice) has badges from both challenges
    const profileResponse = await apiRequest("GET", "/profile", user1.token);
    expect(profileResponse.ok).toBe(true);
    const profileJson = await profileResponse.json();

    // Alice should have badges from winning:
    // - 1 daily_winner badge from the daily_winner challenge (unique per challenge)
    // - 2 challenge_winner badges (one from each challenge)
    const badges = profileJson.data.badges || [];

    const dailyWinnerBadges = badges.filter(
      (b: { badge_type: string }) => b.badge_type === "daily_winner"
    );
    const challengeWinnerBadges = badges.filter(
      (b: { badge_type: string }) => b.badge_type === "challenge_winner"
    );

    // Alice won at least one day in the daily_winner challenge (1 badge per challenge)
    expect(dailyWinnerBadges.length).toBeGreaterThanOrEqual(1);
    // Alice won both challenges (2 challenge winner badges)
    expect(challengeWinnerBadges.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * Independent cumulative mode test with its own users and data
 */
describe("Cumulative Mode Journey", () => {
  let charlie: TestUser;
  let diana: TestUser;

  // Different date range from the daily_winner tests
  const startDate = getDaysAgo(10);
  const endDate = getDaysAgo(7);
  const day1 = getDaysAgo(10);
  const day2 = getDaysAgo(9);
  const day3 = getDaysAgo(8);
  const day4 = getDaysAgo(7);

  beforeAll(async () => {
    charlie = await createTestUser(
      `cumulative-charlie-${Date.now()}@example.com`,
      "password123",
      "Charlie"
    );
    diana = await createTestUser(
      `cumulative-diana-${Date.now()}@example.com`,
      "password123",
      "Diana"
    );
  });

  it("should determine winner by total steps in cumulative mode", async () => {
    // Charlie creates a cumulative challenge
    const createResponse = await apiRequest("POST", "/challenges", charlie.token, {
      title: "Cumulative Step Challenge",
      description: "Winner has most total steps",
      start_date: startDate,
      end_date: endDate,
      mode: "cumulative",
    });

    expect(createResponse.ok).toBe(true);
    const createJson = await createResponse.json();
    const challengeId = createJson.data.challenge.id;
    const inviteCode = createJson.data.challenge.invite_code;

    // Diana joins
    const joinResponse = await apiRequest("POST", "/challenges/join", diana.token, {
      invite_code: inviteCode,
    });
    expect(joinResponse.ok).toBe(true);

    // Log steps for 4 days
    // Charlie: Consistent walker - 8000 steps each day = 32,000 total
    // Diana: Weekend warrior - low weekdays, high weekends = 35,000 total
    // Diana should win despite Charlie being more consistent

    // Day 1 (weekday for Diana)
    await insertTestSteps(charlie.token, day1, 8000);
    await insertTestSteps(diana.token, day1, 5000);

    // Day 2 (weekday for Diana)
    await insertTestSteps(charlie.token, day2, 8000);
    await insertTestSteps(diana.token, day2, 5000);

    // Day 3 (weekend for Diana - big day!)
    await insertTestSteps(charlie.token, day3, 8000);
    await insertTestSteps(diana.token, day3, 12000);

    // Day 4 (weekend for Diana - another big day!)
    await insertTestSteps(charlie.token, day4, 8000);
    await insertTestSteps(diana.token, day4, 13000);

    // Charlie total: 32,000 steps
    // Diana total: 35,000 steps

    // Run cron to finalize
    const cronResponse = await runCron();
    expect(cronResponse.ok).toBe(true);

    // Verify challenge is completed
    const challengeResponse = await apiRequest(
      "GET",
      `/challenges/${challengeId}`,
      charlie.token
    );
    expect(challengeResponse.ok).toBe(true);
    expect(challengeResponse.ok && (await challengeResponse.json()).data.challenge.status).toBe("completed");

    // Verify leaderboard - Diana should win by total steps
    const leaderboardResponse = await apiRequest(
      "GET",
      `/challenges/${challengeId}/leaderboard`,
      charlie.token
    );
    expect(leaderboardResponse.ok).toBe(true);
    const leaderboardJson = await leaderboardResponse.json();
    const leaderboard = leaderboardJson.data.leaderboard;

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].name).toBe("Diana");
    expect(leaderboard[0].total_steps).toBe(35000);
    expect(leaderboard[1].name).toBe("Charlie");
    expect(leaderboard[1].total_steps).toBe(32000);

    // Verify Diana got the challenge_winner badge
    const dianaProfile = await apiRequest("GET", "/profile", diana.token);
    expect(dianaProfile.ok).toBe(true);
    const dianaJson = await dianaProfile.json();
    const dianaBadges = dianaJson.data.badges || [];

    const challengeWinnerBadge = dianaBadges.find(
      (b: { badge_type: string; challenge_id: number }) =>
        b.badge_type === "challenge_winner" && b.challenge_id === challengeId
    );
    expect(challengeWinnerBadge).toBeDefined();

    // Verify cumulative mode doesn't award daily_winner badges
    // (no daily points calculation for cumulative challenges)
    const dailyWinnerBadges = dianaBadges.filter(
      (b: { badge_type: string; challenge_id: number }) =>
        b.badge_type === "daily_winner" && b.challenge_id === challengeId
    );
    expect(dailyWinnerBadges.length).toBe(0);
  });
});
