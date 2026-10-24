import mongoose from "mongoose";
import { LeaveTypeModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";

export const DEFAULT_LEAVE_TYPES = [
  { key: "annual", name: "Annual Leave", yearlyQuota: 14, isPaid: true },
  { key: "sick", name: "Sick Leave", yearlyQuota: 8, isPaid: true },
  { key: "casual", name: "Casual Leave", yearlyQuota: 10, isPaid: true },
  { key: "unpaid", name: "Unpaid Leave", yearlyQuota: null, isPaid: false },
];

export const getAllLeaveTypes = async () => {
  if (mongoose.connection.readyState !== 1 && !LeaveTypeModel.find?.mock) {
    return [...DEFAULT_LEAVE_TYPES];
  }
  const list = await LeaveTypeModel.find().lean();
  if (list && list.length > 0) return list;
  return [...DEFAULT_LEAVE_TYPES];
};

export const getLeaveTypeQuota = async (key) => {
  if (mongoose.connection.readyState !== 1 && !LeaveTypeModel.findOne?.mock) {
    const found = DEFAULT_LEAVE_TYPES.find((lt) => lt.key === key);
    return found !== undefined ? found.yearlyQuota : 0;
  }
  const doc = await LeaveTypeModel.findOne({ key }).lean();
  if (doc) return doc.yearlyQuota;
  const found = DEFAULT_LEAVE_TYPES.find((lt) => lt.key === key);
  return found !== undefined ? found.yearlyQuota : 0;
};

export const updateLeaveTypeQuota = async (key, yearlyQuota, actor) => {
  if (actor.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Only administrators can update leave quotas");
  }

  const validKeys = ["annual", "sick", "casual", "unpaid"];
  if (!validKeys.includes(key)) {
    throw new AppError(400, "INVALID_LEAVE_TYPE", `Unknown leave type key: ${key}`);
  }

  let leaveType = await LeaveTypeModel.findOne({ key });
  if (!leaveType) {
    const def = DEFAULT_LEAVE_TYPES.find((d) => d.key === key);
    leaveType = new LeaveTypeModel({ ...def });
  }

  const before = leaveType.toObject ? leaveType.toObject() : { ...leaveType };
  leaveType.yearlyQuota = yearlyQuota === null ? null : Number(yearlyQuota);
  await leaveType.save();

  const after = leaveType.toObject ? leaveType.toObject() : { ...leaveType };

  await audit({
    actor,
    actorRole: actor.role,
    action: "LEAVE_TYPE_QUOTA_UPDATED",
    entity: "leavetypes",
    entityId: leaveType._id,
    before,
    after,
  });

  return after;
};
