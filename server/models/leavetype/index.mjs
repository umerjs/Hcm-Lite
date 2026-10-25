import mongoose from "mongoose";

const LeaveTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    key: {
      type: String,
      enum: ["annual", "sick", "casual", "unpaid"],
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    yearlyQuota: {
      type: Number,
      default: null, // null = unlimited
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

LeaveTypeSchema.index({ companyId: 1, key: 1 }, { unique: true });

export const LeaveTypeModel =
  mongoose.models.leavetypes || mongoose.model("leavetypes", LeaveTypeSchema);
