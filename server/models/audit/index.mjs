import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    actorRole: {
      type: String,
      enum: ["admin", "hr", "employee", "system"],
      default: "system",
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // append-only
  },
);

const prohibitedMutation = function () {
  throw new Error("Audit logs are append-only: updates and deletes are prohibited");
};

// Document-level hook: disallow save() on existing document
AuditLogSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit logs are append-only: updates and deletes are prohibited");
  }
});

// Query-level middleware
const queryMutationMethods = [
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "replaceOne",
];
AuditLogSchema.pre(queryMutationMethods, prohibitedMutation);
try {
  AuditLogSchema.pre("bulkWrite", prohibitedMutation);
} catch {
  // Model static handles bulkWrite
}

// Model-level overrides ensuring invocation throws
for (const method of queryMutationMethods) {
  AuditLogSchema.statics[method] = prohibitedMutation;
}
AuditLogSchema.statics.bulkWrite = prohibitedMutation;

// Indexes for audit querying
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1 });

export const AuditLogModel =
  mongoose.models.auditlogs || mongoose.model("auditlogs", AuditLogSchema);
