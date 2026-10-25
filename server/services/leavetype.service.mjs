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

export const getAllLeaveTypes = async (companyIdOrActor = null) => {
  const companyId =
    companyIdOrActor?.companyId ||
    (typeof companyIdOrActor === "string" || companyIdOrActor instanceof mongoose.Types.ObjectId
      ? companyIdOrActor
      : null);
  const query = companyId ? { companyId } : {};

  if (mongoose.connection.readyState !== 1 && !LeaveTypeModel.find?.mock) {
    return DEFAULT_LEAVE_TYPES.map((lt) => ({ ...lt, ...(companyId ? { companyId } : {}) }));
  }
  const list = await LeaveTypeModel.find(query).lean();
  if (list && list.length > 0) return list;
  return DEFAULT_LEAVE_TYPES.map((lt) => ({ ...lt, ...(companyId ? { companyId } : {}) }));
};

export const getLeaveTypeQuota = async (key, companyIdOrActor = null) => {
  const companyId =
    companyIdOrActor?.companyId ||
    (typeof companyIdOrActor === "string" || companyIdOrActor instanceof mongoose.Types.ObjectId
      ? companyIdOrActor
      : null);
  const query = { key, ...(companyId ? { companyId } : {}) };

  if (mongoose.connection.readyState !== 1 && !LeaveTypeModel.findOne?.mock) {
    const found = DEFAULT_LEAVE_TYPES.find((lt) => lt.key === key);
    return found !== undefined ? found.yearlyQuota : 0;
  }
  const doc = await LeaveTypeModel.findOne(query).lean();
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

  const companyId = actor.companyId;
  const query = { key, ...(companyId ? { companyId } : {}) };

  let leaveType = await LeaveTypeModel.findOne(query);
  if (!leaveType) {
    const def = DEFAULT_LEAVE_TYPES.find((d) => d.key === key);
    leaveType = new LeaveTypeModel({ ...def, companyId });
  }

  const before = leaveType.toObject ? leaveType.toObject() : { ...leaveType };
  leaveType.yearlyQuota = yearlyQuota === null ? null : Number(yearlyQuota);
  if (companyId && !leaveType.companyId) {
    leaveType.companyId = companyId;
  }
  await leaveType.save();

  const after = leaveType.toObject ? leaveType.toObject() : { ...leaveType };

  await audit({
    companyId: companyId || leaveType.companyId,
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
