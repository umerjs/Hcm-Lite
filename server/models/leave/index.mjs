import mongoose from "mongoose";

const LeaveRequestSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "employees",
      required: true,
    },
    type: {
      type: String,
      enum: ["annual", "sick", "casual", "unpaid"],
      required: true,
    },
    startDate: {
      type: String, // YYYY-MM-DD in Asia/Karachi
      required: true,
      trim: true,
    },
    endDate: {
      type: String, // YYYY-MM-DD in Asia/Karachi
      required: true,
      trim: true,
    },
    days: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    comment: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true },
);

// Index on { companyId, employeeId, startDate } as specified in PRD Section 7
LeaveRequestSchema.index({ companyId: 1, employeeId: 1, startDate: 1 });

export const LeaveRequestModel =
  mongoose.models.leaverequests || mongoose.model("leaverequests", LeaveRequestSchema);
