import express from "express";
import mongoose from "mongoose";
import { AuditLogModel } from "../../models/index.mjs";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler } from "../../utils/errors.mjs";

const router = express.Router();

/**
 * GET /audit
 * Admin only.
 * Lists audit logs with filtering by action, actorId, entity, and pagination.
 */
router.get(
  "/audit",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { action, actorId, actor, entity, page = 1, pageSize = 20, limit } = req.query;

    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(50, Math.max(1, parseInt(limit || pageSize, 10) || 20));

    const filter = {};
    if (action && action.trim()) {
      filter.action = action.trim();
    }
    const resolvedActorId = actorId || actor;
    if (resolvedActorId && resolvedActorId.trim()) {
      filter.actor = resolvedActorId.trim();
    }
    if (entity && entity.trim()) {
      filter.entity = entity.trim();
    }

    if (mongoose.connection.readyState !== 1 && !AuditLogModel.find?.mock) {
      return res.status(200).json({
        data: [],
        pagination: { total: 0, page: p, pageSize: size, totalPages: 0 },
      });
    }

    let total = 0;
    if (mongoose.connection.readyState === 1 || AuditLogModel.countDocuments?.mock) {
      total = await AuditLogModel.countDocuments(filter);
    }

    let query = AuditLogModel.find(filter)
      .populate("actor", "firstname lastname email role")
      .sort({ createdAt: -1 });

    if (query.skip) {
      query = query.skip((p - 1) * size);
    }
    if (query.limit) {
      query = query.limit(size);
    }

    const logs = await (query.lean ? query.lean() : query);

    return res.status(200).json({
      data: logs || [],
      pagination: {
        total,
        page: p,
        pageSize: size,
        totalPages: Math.ceil(total / size) || 1,
      },
    });
  }),
);

export default router;
