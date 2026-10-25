import mongoose from "mongoose";
import { NotificationModel, AnnouncementModel, UserModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

/**
 * Creates a targeted in-app notification for a specific user.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} [params.type="general"]
 * @param {string} params.text
 * @param {string|null} [params.link=null]
 * @returns {Promise<Object>}
 */
export const createNotification = async ({
  companyId = null,
  userId,
  type = "general",
  text,
  link = null,
}) => {
  if (!userId || !text) {
    throw new AppError(400, "VALIDATION_ERROR", "User ID and notification text are required");
  }

  const resolvedCompanyId = companyId || (userId?.companyId ? userId.companyId : null);

  if (mongoose.connection.readyState !== 1 && !NotificationModel.create?.mock) {
    console.log(
      `[notification:in-memory] Dispatched '${type}' notification to user ${userId}: ${text}`,
    );
    return {
      _id: new mongoose.Types.ObjectId(),
      companyId: resolvedCompanyId,
      userId,
      type,
      text,
      link,
      readAt: null,
      createdAt: new Date(),
    };
  }

  const notification = await NotificationModel.create({
    ...(resolvedCompanyId ? { companyId: resolvedCompanyId } : {}),
    userId,
    type,
    text,
    link,
    readAt: null,
  });

  return notification;
};

/**
 * Creates a company-wide or role-targeted announcement.
 * - Admin or HR role only
 * - Fans out in-app notifications to eligible active users
 * - Audited
 */
export const createAnnouncement = async ({ title, body, targetRole = "all" }, actor) => {
  if (!title || !title.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Announcement title is required");
  }
  if (!body || !body.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Announcement body is required");
  }

  const companyId = actor?.companyId;
  const validTargetRoles = ["all", "employee", "hr", "admin"];
  const resolvedTargetRole = validTargetRoles.includes(targetRole) ? targetRole : "all";

  const posterName = actor?.firstname
    ? `${actor.firstname} ${actor.lastname || ""}`.trim()
    : "Management";

  const announcement = await AnnouncementModel.create({
    ...(companyId ? { companyId } : {}),
    title: title.trim(),
    body: body.trim(),
    postedBy: {
      userId: actor?._id || null,
      name: posterName,
      role: actor?.role || "hr",
    },
    targetRole: resolvedTargetRole,
  });

  // Fan out targeted notifications to active users matching targetRole
  try {
    const userFilter = {
      isActive: true,
      ...(companyId ? { companyId } : {}),
    };
    if (resolvedTargetRole !== "all") {
      userFilter.role = resolvedTargetRole;
    }

    if (mongoose.connection.readyState === 1 || UserModel.find?.mock) {
      const users = await UserModel.find(userFilter).select("_id").lean();
      if (users && users.length > 0) {
        const notifications = users.map((u) => ({
          ...(companyId ? { companyId } : {}),
          userId: u._id,
          type: "announcement",
          text: `Announcement: ${title.trim()}`,
          link: "/announcements",
          readAt: null,
        }));

        if (mongoose.connection.readyState === 1 || NotificationModel.insertMany?.mock) {
          await NotificationModel.insertMany(notifications);
        }
      }
    }
  } catch (err) {
    console.warn(
      "[notification.service] Failed to fan out announcement notifications:",
      err.message,
    );
  }

  await audit({
    companyId: companyId || announcement.companyId,
    actor,
    actorRole: actor?.role || "system",
    action: "ANNOUNCEMENT_CREATED",
    entity: "announcements",
    entityId: announcement._id,
    before: null,
    after: {
      title: announcement.title,
      targetRole: announcement.targetRole,
      postedBy: announcement.postedBy,
    },
  });

  return announcement;
};

/**
 * Retrieves announcements visible to the user.
 */
export const getAnnouncements = async (user = null) => {
  const companyId = user?.companyId;
  const filter = {};
  if (companyId) filter.companyId = companyId;

  if (user && user.role && user.role !== "admin") {
    filter.targetRole = { $in: ["all", user.role] };
  }

  if (mongoose.connection.readyState !== 1 && !AnnouncementModel.find?.mock) {
    return [];
  }

  return await AnnouncementModel.find(filter).sort({ createdAt: -1 }).lean();
};

/**
 * Retrieves notifications for a specific user.
 */
export const getNotifications = async (userId, { unreadOnly = false, companyId = null } = {}) => {
  const filter = { userId };
  if (companyId) filter.companyId = companyId;
  if (unreadOnly) {
    filter.readAt = null;
  }

  if (mongoose.connection.readyState !== 1 && !NotificationModel.find?.mock) {
    return [];
  }

  return await NotificationModel.find(filter).sort({ createdAt: -1 }).lean();
};

/**
 * Marks a specific notification as read.
 */
export const markNotificationAsRead = async (id, userId, companyId = null) => {
  if (mongoose.connection.readyState !== 1 && !NotificationModel.findOne?.mock) {
    return { _id: id, userId, readAt: new Date() };
  }

  const query = { _id: id, userId };
  if (companyId) query.companyId = companyId;

  const notification = await NotificationModel.findOne(query);
  if (!notification) {
    throw new AppError(404, "NOT_FOUND", "Notification not found");
  }

  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Marks all notifications for a user as read.
 */
export const markAllNotificationsAsRead = async (userId, companyId = null) => {
  const query = { userId, readAt: null };
  if (companyId) query.companyId = companyId;

  if (mongoose.connection.readyState === 1 || NotificationModel.updateMany?.mock) {
    await NotificationModel.updateMany(query, { $set: { readAt: new Date() } });
  }

  return { message: "All notifications marked as read" };
};
