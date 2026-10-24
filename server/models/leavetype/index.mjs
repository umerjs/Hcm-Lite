import mongoose from "mongoose";

const LeaveTypeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["annual", "sick", "casual", "unpaid"],
      required: true,
      unique: true,
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

export const LeaveTypeModel =
  mongoose.models.leavetypes || mongoose.model("leavetypes", LeaveTypeSchema);
