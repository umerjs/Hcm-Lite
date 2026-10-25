import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    type: {
      type: String,
      enum: ["leave_decision", "payslip", "correction_decision", "announcement", "general"],
      default: "general",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

NotificationSchema.index({ companyId: 1, userId: 1, readAt: 1 });

export const NotificationModel =
  mongoose.models.notifications || mongoose.model("notifications", NotificationSchema);

const AnnouncementSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    postedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
      name: { type: String, default: "Management" },
      role: { type: String, default: "hr" },
    },
    targetRole: {
      type: String,
      enum: ["all", "employee", "hr", "admin"],
      default: "all",
    },
  },
  { timestamps: true },
);

AnnouncementSchema.index({ companyId: 1, createdAt: -1 });

export const AnnouncementModel =
  mongoose.models.announcements || mongoose.model("announcements", AnnouncementSchema);
