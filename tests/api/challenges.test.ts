import { describe, it, expect, beforeAll } from "vitest";
import { createTestUser, apiRequest, getToday, type TestUser } from "../helpers";

describe("Challenges API", () => {
  let user: TestUser;

  beforeAll(async () => {
    user = await createTestUser();
  });

  describe("POST /api/challenges", () => {
    it("should create a challenge", async () => {
      const today = getToday();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split("T")[0];

      const response = await apiRequest("POST", "/challenges", user.token, {
        title: "Test Challenge",
        description: "A test challenge",
        start_date: today,
        end_date: endDateStr,
        mode: "cumulative",
      });

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.data.challenge).toBeDefined();
      expect(json.data.challenge.title).toBe("Test Challenge");
      // Challenges start as pending until the cron job activates them
      expect(json.data.challenge.status).toBe("pending");
    });

    it("should reject challenge with end date before start date", async () => {
      const today = getToday();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const response = await apiRequest("POST", "/challenges", user.token, {
        title: "Bad Challenge",
        start_date: today,
        end_date: yesterdayStr,
        mode: "cumulative",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/challenges", () => {
    it("should return user challenges", async () => {
      const response = await apiRequest("GET", "/challenges", user.token);

      expect(response.ok).toBe(true);
      const json = await response.json();
      expect(json.data.challenges).toBeDefined();
      expect(Array.isArray(json.data.challenges)).toBe(true);
    });
  });

  describe("POST /api/challenges/join", () => {
    it("should allow another user to join via invite code", async () => {
      // Create a challenge with first user
      const today = getToday();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split("T")[0];

      const createResponse = await apiRequest("POST", "/challenges", user.token, {
        title: "Joinable Challenge",
        start_date: today,
        end_date: endDateStr,
        mode: "cumulative",
      });
      const json = await createResponse.json();
      const inviteCode = json.data.challenge.invite_code;

      // Create second user and join using invite code
      const user2 = await createTestUser();
      const joinResponse = await apiRequest(
        "POST",
        "/challenges/join",
        user2.token,
        { invite_code: inviteCode }
      );

      expect(joinResponse.ok).toBe(true);
      const joinJson = await joinResponse.json();
      expect(joinJson.data.challenge.id).toBe(json.data.challenge.id);
    });

    it("should reject invalid invite code", async () => {
      const response = await apiRequest("POST", "/challenges/join", user.token, {
        invite_code: "INVALID_CODE",
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });
});
