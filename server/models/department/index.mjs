import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

DepartmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const DepartmentModel =
  mongoose.models.departments || mongoose.model("departments", DepartmentSchema);
