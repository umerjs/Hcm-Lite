import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import { UserModel, AILogModel } from "../models/index.mjs";
import * as aiService from "../services/ai.service.mjs";
import * as leaveService from "../services/leave.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice B5: AI Chat & Smart Leave API", () => {
  const companyId = "671a11112222333344449999";
  const employeeUserId = "671a11112222333344440003";
  const employeeId = "671a11112222333344440004";
  const rateLimitUserId = "671a11112222333344440088";

  let employeeToken;
  let rateLimitToken;
  let mockCompletionsCreate;

  beforeEach(() => {
    vi.restoreAllMocks();

    employeeToken = jwt.sign(
      { _id: employeeUserId, role: "employee", email: "emp@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    rateLimitToken = jwt.sign(
      { _id: rateLimitUserId, role: "employee", email: "rate@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Mock UserModel.findById() for requireAuth
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const idStr = String(id);
      const isRateLimitUser = idStr === rateLimitUserId;
      const mockDoc = {
        _id: id,
        companyId,
        email: isRateLimitUser ? "rate@company.com" : "emp@company.com",
        role: "employee",
        employeeId: isRateLimitUser ? "671a11112222333344440089" : employeeId,
        isActive: true,
        mustChangePassword: false,
      };

      return {
        select: vi.fn().mockResolvedValue(mockDoc),
        lean: vi.fn().mockResolvedValue(mockDoc),
        then: (resolve) => resolve(mockDoc),
      };
    });

    // Setup mock OpenAI client
    mockCompletionsCreate = vi.fn();
    aiService.setOpenAIClient({
      chat: {
        completions: {
          create: mockCompletionsCreate,
        },
      },
    });
  });

  describe("Validation & Security", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const res = await request(app).post("/api/v1/ai/chat").send({ message: "Hello" });
      expect(res.status).toBe(401);
    });

    it("rejects empty or whitespace message with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Standard Conversational Chat & AILogModel Persistence", () => {
    it("successfully answers conversational prompt and inserts record into AILogModel", async () => {
      mockCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Hello! I can help you check your leave balance or apply for leave.",
            },
          },
        ],
        usage: { total_tokens: 42 },
      });

      const logCreateSpy = vi.spyOn(AILogModel, "create").mockResolvedValueOnce({
        _id: "log_mock_001",
        userId: employeeUserId,
        prompt: "Hello assistant",
        response: "Hello! I can help you check your leave balance or apply for leave.",
        toolsUsed: [],
        tokens: 42,
      });

      const res = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "Hello assistant" });

      expect(res.status).toBe(200);
      expect(res.body.response).toContain("Hello! I can help you");
      expect(res.body.toolsUsed).toEqual([]);
      expect(res.body.tokens).toBe(42);

      expect(logCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.anything(),
          prompt: "Hello assistant",
          response: expect.stringContaining("Hello! I can help you"),
          toolsUsed: [],
          tokens: 42,
        }),
      );
    });
  });

  describe("Smart Leave Tool Calling", () => {
    it("executes check_my_leave_balance tool when LLM calls it", async () => {
      // 1. Initial LLM call decides to invoke tool
      mockCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              tool_calls: [
                {
                  id: "call_balance_1",
                  type: "function",
                  function: {
                    name: "check_my_leave_balance",
                    arguments: JSON.stringify({ year: 2026 }),
                  },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 30 },
      });

      // 2. Mock leaveService.getBalance
      vi.spyOn(leaveService, "getBalance").mockResolvedValueOnce({
        annual: { quota: 14, approved: 4, pending: 0, balance: 10 },
        sick: { quota: 8, approved: 0, pending: 0, balance: 8 },
        casual: { quota: 10, approved: 2, pending: 0, balance: 8 },
      });

      // 3. Second LLM call formats the final response
      mockCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "You have 10 annual, 8 sick, and 8 casual leaves remaining for 2026.",
            },
          },
        ],
        usage: { total_tokens: 35 },
      });

      const logCreateSpy = vi.spyOn(AILogModel, "create").mockResolvedValueOnce({
        _id: "log_mock_tool_1",
      });

      const res = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "How many leaves do I have left?" });

      expect(res.status).toBe(200);
      expect(res.body.response).toContain("10 annual");
      expect(res.body.toolsUsed).toEqual(["check_my_leave_balance"]);
      expect(res.body.tokens).toBe(65);

      expect(leaveService.getBalance).toHaveBeenCalled();
      expect(logCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toolsUsed: ["check_my_leave_balance"],
          tokens: 65,
        }),
      );
    });

    it("executes apply_for_leave tool when LLM calls it", async () => {
      // 1. Initial LLM call decides to apply for leave
      mockCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              tool_calls: [
                {
                  id: "call_apply_1",
                  type: "function",
                  function: {
                    name: "apply_for_leave",
                    arguments: JSON.stringify({
                      type: "casual",
                      startDate: "2026-11-10",
                      endDate: "2026-11-12",
                      reason: "Sister's wedding",
                    }),
                  },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 40 },
      });

      // 2. Mock leaveService.applyLeave
      vi.spyOn(leaveService, "applyLeave").mockResolvedValueOnce({
        _id: "leave_created_123",
        employeeId,
        type: "casual",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        days: 3,
        status: "pending",
      });

      // 3. Second LLM call formats the confirmation
      mockCompletionsCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Your casual leave request for 3 days (Nov 10 - Nov 12) has been submitted.",
            },
          },
        ],
        usage: { total_tokens: 30 },
      });

      vi.spyOn(AILogModel, "create").mockResolvedValueOnce({
        _id: "log_mock_tool_2",
      });

      const res = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          message: "I want to take casual leave from 2026-11-10 to 2026-11-12 for Sister's wedding",
        });

      expect(res.status).toBe(200);
      expect(res.body.response).toContain("casual leave request for 3 days");
      expect(res.body.toolsUsed).toEqual(["apply_for_leave"]);

      expect(leaveService.applyLeave).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId }),
        expect.objectContaining({
          type: "casual",
          startDate: "2026-11-10",
          endDate: "2026-11-12",
          reason: "Sister's wedding",
        }),
      );
    });
  });

  describe("Timeout Handling", () => {
    it("handles 15s LLM network timeout with 504 AI_GATEWAY_TIMEOUT", async () => {
      const abortError = new Error("The operation was aborted due to timeout");
      abortError.name = "AbortError";
      mockCompletionsCreate.mockRejectedValueOnce(abortError);

      const res = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ message: "Will this time out?" });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe("AI_GATEWAY_TIMEOUT");
    });
  });

  describe("Strict Rate Limiting (20 req / hour)", () => {
    it("allows 20 requests and rejects the 21st request with 429 Too Many Requests", async () => {
      mockCompletionsCreate.mockResolvedValue({
        choices: [{ message: { role: "assistant", content: "OK" } }],
        usage: { total_tokens: 5 },
      });
      vi.spyOn(AILogModel, "create").mockResolvedValue({ _id: "log_mock_rate" });

      // First 20 requests succeed
      for (let i = 1; i <= 20; i++) {
        const res = await request(app)
          .post("/api/v1/ai/chat")
          .set("Authorization", `Bearer ${rateLimitToken}`)
          .send({ message: `Message ${i}` });

        expect(res.status).toBe(200);
      }

      // 21st request fails with 429
      const res21 = await request(app)
        .post("/api/v1/ai/chat")
        .set("Authorization", `Bearer ${rateLimitToken}`)
        .send({ message: "Message 21" });

      expect(res21.status).toBe(429);
      expect(res21.body.message).toMatch(/Too Many Requests/i);
    });
  });
});
