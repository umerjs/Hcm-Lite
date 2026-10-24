import mongoose from "mongoose";

const AILogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
      index: true,
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

export const AILogModel = mongoose.models.ai_logs || mongoose.model("ai_logs", AILogSchema);
