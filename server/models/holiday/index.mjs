import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

HolidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

export const HolidayModel = mongoose.models.holidays || mongoose.model("holidays", HolidaySchema);
