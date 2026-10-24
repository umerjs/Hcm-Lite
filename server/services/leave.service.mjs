import mongoose from "mongoose";
import { LeaveRequestModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { formatDate } from "../src/rules/time.mjs";
import { validateLeaveRequest } from "../src/rules/leave.mjs";
import { getSettings } from "./settings.service.mjs";
import { getHolidaysForRange } from "./holiday.service.mjs";
import { getLeaveTypeQuota, getAllLeaveTypes } from "./leavetype.service.mjs";
import { createNotification } from "./notification.service.mjs";
import * as auditService from "./audit.service.mjs";

/**
 * Applies for a new leave request.
 * Strictly uses pure function rules/leave.mjs:validateLeaveRequest for all validations.
 */
export const applyLeave = async (user, { type, startDate, endDate, reason }) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  if (!type || !startDate || !endDate || !reason) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "All fields (type, startDate, endDate, reason) are required",
    );
  }

  const settings = await getSettings();
  const holidays = await getHolidaysForRange(startDate, endDate);
  const quota = await getLeaveTypeQuota(type);

  // Fetch all existing leave requests for this employee in the calendar year
  const year = startDate.slice(0, 4);
  const existingRequests = await LeaveRequestModel.find({
    employeeId,
    startDate: { $regex: `^${year}` },
  }).lean();

  const usedDays = existingRequests
    .filter((r) => r.type === type && r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);

  const pendingDays = existingRequests
    .filter((r) => r.type === type && r.status === "pending")
    .reduce((sum, r) => sum + r.days, 0);

  // Run authoritative pure business rules (including today validation)
  const validation = validateLeaveRequest({
    startDate,
    endDate,
    today: new Date(),
    quota,
    usedDays,
    pendingDays,
    existingRequests,
    weekend: settings.weekend,
    holidays,
  });

  if (!validation.valid) {
    throw new AppError(validation.error.status, validation.error.code, validation.error.message);
  }

  const leave = await LeaveRequestModel.create({
    employeeId,
    type,
    startDate,
    endDate,
    days: validation.days,
    reason: reason.trim(),
    status: "pending",
  });

  return leave;
};

/**
 * Cancels a leave request (own pending or future-approved only).
 */
export const cancelLeave = async (user, leaveId) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  const leave = await LeaveRequestModel.findById(leaveId);
  if (!leave) {
    throw new AppError(404, "NOT_FOUND", "Leave request not found");
  }

  if (String(leave.employeeId) !== String(employeeId)) {
    throw new AppError(403, "FORBIDDEN", "Cannot cancel another employee's leave request");
  }

  const todayStr = formatDate(new Date());
  const isFutureApproved = leave.status === "approved" && leave.startDate > todayStr;

  if (leave.status !== "pending" && !isFutureApproved) {
    throw new AppError(
      422,
      "CANNOT_CANCEL",
      "Only pending or future approved leave requests can be cancelled",
    );
  }

  const before = { status: leave.status };
  leave.status = "cancelled";
  await leave.save();

  // Audit log mutation
  await auditService.audit({
    actor: user,
    action: "LEAVE_CANCEL",
    entity: "leaverequests",
    entityId: leave._id,
    before,
    after: { status: leave.status },
  });

  return leave;
};

/**
 * Returns leave quota, approved days, pending days, and remaining balance for the employee.
 */
export const getBalance = async (user, year) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  const targetYear = year || formatDate(new Date()).slice(0, 4);
  const leaveTypes = await getAllLeaveTypes();

  const requests = await LeaveRequestModel.find({
    employeeId,
    startDate: { $regex: `^${targetYear}` },
    status: { $in: ["approved", "pending"] },
  }).lean();

  const balances = leaveTypes.map((lt) => {
    const used = requests
      .filter((r) => r.type === lt.key && r.status === "approved")
      .reduce((sum, r) => sum + r.days, 0);

    const pending = requests
      .filter((r) => r.type === lt.key && r.status === "pending")
      .reduce((sum, r) => sum + r.days, 0);

    const remaining = lt.yearlyQuota === null ? null : Math.max(0, lt.yearlyQuota - used);

    return {
      type: lt.key,
      name: lt.name,
      yearlyQuota: lt.yearlyQuota,
      used,
      pending,
      remaining,
    };
  });

  return {
    year: targetYear,
    balances,
  };
};

/**
 * HR/Admin decision on a leave request (approve or reject with comment).
 * Approver cannot approve their own request. Comment required on reject.
 */
export const decideLeave = async (user, leaveId, { status, comment }) => {
  const leave = await LeaveRequestModel.findById(leaveId);
  if (!leave) {
    throw new AppError(404, "NOT_FOUND", "Leave request not found");
  }

  // Self-approval restriction: an approver cannot decide their own request
  if (user.employeeId && String(leave.employeeId) === String(user.employeeId)) {
    throw new AppError(
      422,
      "CANNOT_DECIDE_OWN_LEAVE",
      "Approver cannot approve or reject their own leave request",
    );
  }

  if (leave.status !== "pending") {
    throw new AppError(422, "ALREADY_DECIDED", `Leave request is already ${leave.status}`);
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError(400, "INVALID_STATUS", "Decision status must be 'approved' or 'rejected'");
  }

  if (status === "rejected" && (!comment || !comment.trim())) {
    throw new AppError(
      400,
      "COMMENT_REQUIRED",
      "Comment is required when rejecting a leave request",
    );
  }

  const before = { status: leave.status, comment: leave.comment };
  leave.status = status;
  leave.decidedBy = user._id;
  leave.comment = comment ? comment.trim() : null;
  await leave.save();

  // Audit log mutation
  await auditService.audit({
    actor: user,
    action: "LEAVE_DECISION",
    entity: "leaverequests",
    entityId: leave._id,
    before,
    after: {
      status: leave.status,
      comment: leave.comment,
      decidedBy: leave.decidedBy,
    },
  });

  // Send in-app notification to employee
  await createNotification({
    userId: leave.employeeId,
    type: "leave_decision",
    text: `Your ${leave.type} leave request (${leave.startDate} to ${leave.endDate}) has been ${status}.`,
    link: `/leave`,
  });

  return leave;
};

/**
 * Retrieves leave requests.
 * - Employees can only see their own requests.
 * - HR and Admin can see all requests with optional filters.
 */
export const getLeaves = async (user, filters = {}) => {
  const query = {};

  if (user.role === "employee") {
    if (!user.employeeId) {
      throw new AppError(
        403,
        "NO_EMPLOYEE_PROFILE",
        "No employee profile associated with this account",
      );
    }
    query.employeeId = user.employeeId;
  } else if (filters.employeeId) {
    query.employeeId = filters.employeeId;
  }

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.year) query.startDate = { $regex: `^${filters.year}` };

  const leaves = await LeaveRequestModel.find(query)
    .populate("employeeId", "name code email departmentId")
    .sort({ createdAt: -1 })
    .lean();

  return leaves;
};

/**
 * Retrieves a single leave request by ID with strict ownership check for Employees.
 */
export const getLeaveById = async (user, leaveId) => {
  const leave = await LeaveRequestModel.findById(leaveId)
    .populate("employeeId", "name code email")
    .lean();

  if (!leave) {
    throw new AppError(404, "NOT_FOUND", "Leave request not found");
  }

  if (
    user.role === "employee" &&
    (!user.employeeId ||
      String(leave.employeeId._id || leave.employeeId) !== String(user.employeeId))
  ) {
    throw new AppError(403, "FORBIDDEN", "Cannot view another employee's leave request");
  }

  return leave;
};
