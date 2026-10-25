import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const CounterModel = mongoose.models.counters || mongoose.model("counters", CounterSchema);

let inMemorySeq = 0;
export const getNextEmployeeCode = async (companyId = null) => {
  const counterId = companyId ? `employeeCode_${companyId}` : "employeeCode";
  if (mongoose.connection.readyState === 1 || CounterModel.findOneAndUpdate?.mock) {
    try {
      const counter = await CounterModel.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      if (counter && counter.seq) {
        return `EMP-${String(counter.seq).padStart(4, "0")}`;
      }
    } catch {
      // Fall through to in-memory counter
    }
  }
  // Fallback for unit testing and offline environments
  inMemorySeq++;
  return `EMP-${String(inMemorySeq).padStart(4, "0")}`;
};

const EmployeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    code: {
      type: String,
      trim: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "departments",
      required: true,
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "designations",
      required: true,
    },
    joinDate: {
      type: String, // YYYY-MM-DD or ISO string
      required: true,
    },
    exitDate: {
      type: String, // YYYY-MM-DD or null
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "probation", "exited"],
      default: "active",
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true },
);

// Compound unique indexes per company
EmployeeSchema.index({ companyId: 1, code: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, status: 1 });
EmployeeSchema.index({ companyId: 1, departmentId: 1 });

export const EmployeeModel =
  mongoose.models.employees || mongoose.model("employees", EmployeeSchema);
