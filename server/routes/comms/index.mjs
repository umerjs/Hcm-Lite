import express from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middlewares/index.mjs";
import { asyncHandler, AppError } from "../../utils/errors.mjs";
import * as notificationService from "../../services/notification.service.mjs";

const router = express.Router();

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Announcement title is required"),
  body: z.string().min(1, "Announcement body is required"),
  targetRole: z.enum(["all", "employee", "hr", "admin"]).optional(),
});

const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      fields[key] = issue.message;
    }
    throw new AppError(400, "VALIDATION_ERROR", "Validation failed", fields);
  }
  req.validatedBody = result.data;
  next();
};

// ── Announcements Routes ─────────────────────────────────────────────────────

/**
 * GET /announcements
 * View company announcements (all authenticated users).
 */
router.get(
  "/announcements",
  requireAuth,
  asyncHandler(async (req, res) => {
    const announcements = await notificationService.getAnnouncements(req.user);
    return res.status(200).json({ data: announcements });
  }),
);

/**
 * POST /announcements
 * Post a company announcement (Admin & HR).
 */
router.post(
  "/announcements",
  requireAuth,
  requireRole("admin", "hr"),
  validateBody(createAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const announcement = await notificationService.createAnnouncement(req.validatedBody, req.user);
    return res.status(201).json({
      message: "Announcement posted successfully",
      data: announcement,
    });
  }),
);

// ── Notifications Routes ─────────────────────────────────────────────────────

/**
 * GET /notifications
 * Retrieve in-app notifications for authenticated user.
 */
router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const unreadOnly = req.query.unread === "true";
    const notifications = await notificationService.getNotifications(req.user._id, {
      unreadOnly,
    });
    return res.status(200).json({ data: notifications });
  }),
);

/**
 * PATCH /notifications/:id/read
 * Mark a single notification as read.
 */
router.patch(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markNotificationAsRead(
      req.params.id,
      req.user._id,
    );
    return res.status(200).json({ message: "Notification marked as read", data: notification });
  }),
);

/**
 * PATCH /notifications/read-all
 * Mark all notifications for the user as read.
 */
router.patch(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllNotificationsAsRead(req.user._id);
    return res.status(200).json(result);
  }),
);

export default router;
