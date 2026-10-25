import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema(
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
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "departments",
      default: null,
    },
  },
  { timestamps: true },
);

DesignationSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const DesignationModel =
  mongoose.models.designations || mongoose.model("designations", DesignationSchema);
