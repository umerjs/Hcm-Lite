import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as aiService from "../../services/ai.service.mjs";

const router = express.Router();

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 20,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    return req.user?.id || req.user?._id?.toString() || req.ip || "unknown";
  },
  handler: (_req, res) => {
    return res.status(429).json({
      error: "Too Many Requests",
      message: "Too Many Requests",
      code: "RATE_LIMIT_EXCEEDED",
    });
  },
});

/**
 * POST /ai/chat (canonical /api/v1/ai/chat)
 * Employee / HR / Admin AI chat endpoint with smart leave tools.
 * Rate limited to 20 requests per hour per IP/userId.
 */
router.post(
  "/ai/chat",
  requireAuth,
  aiRateLimiter,
  asyncHandler(async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new AppError(400, "VALIDATION_ERROR", "Field 'message' is required");
    }

    const result = await aiService.processChat({
      userId: req.user._id,
      role: req.user.role,
      employeeId: req.user.employeeId,
      message: message.trim(),
    });

    return res.status(200).json(result);
  }),
);

export default router;
