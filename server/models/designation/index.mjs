import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
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

export const DesignationModel =
  mongoose.models.designations || mongoose.model("designations", DesignationSchema);
