import mongoose from "mongoose";

const AILogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    response: {
      type: String,
      required: true,
    },
    toolsUsed: {
      type: [String],
      default: [],
    },
    tokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

AILogSchema.index({ companyId: 1, userId: 1 });
AILogSchema.index({ companyId: 1, createdAt: -1 });

export const AILogModel = mongoose.models.ai_logs || mongoose.model("ai_logs", AILogSchema);
