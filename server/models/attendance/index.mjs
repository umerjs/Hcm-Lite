import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employees",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD in Asia/Karachi
      required: true,
      trim: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    workedHours: {
      type: Number,
      default: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    isNonWorkingDay: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["present", "half_day", "missing_checkout"],
      default: "present",
    },
  },
  { timestamps: true },
);

// Unique index: one check-in per employee per date
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const AttendanceModel =
  mongoose.models.attendances || mongoose.model("attendances", AttendanceSchema);
