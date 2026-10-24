import mongoose from "mongoose";

const CorrectionSchema = new mongoose.Schema(
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
    requestedCheckIn: {
      type: Date,
      default: null,
    },
    requestedCheckOut: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
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

// Index on { employeeId, status } as specified in PRD Section 7
CorrectionSchema.index({ employeeId: 1, status: 1 });

export const CorrectionModel =
  mongoose.models.corrections || mongoose.model("corrections", CorrectionSchema);
