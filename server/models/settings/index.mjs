import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    companyName: {
      type: String,
      default: "HCM Lite",
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Karachi",
    },
    officeStart: {
      type: String,
      default: "09:00",
    },
    graceMinutes: {
      type: Number,
      default: 15,
    },
    halfDayHours: {
      type: Number,
      default: 5,
    },
    weekend: {
      type: [String],
      default: ["Sat", "Sun"],
    },
    officeLat: {
      type: Number,
      default: null,
    },
    officeLng: {
      type: Number,
      default: null,
    },
    radiusMeters: {
      type: Number,
      default: 150,
    },
    latePenaltyEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

SettingsSchema.index({ companyId: 1 }, { unique: true });

export const SettingsModel = mongoose.models.settings || mongoose.model("settings", SettingsSchema);
