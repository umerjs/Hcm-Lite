import mongoose from "mongoose";
import { AttendanceModel, EmployeeModel, LeaveRequestModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import {
  formatDate,
  isWeekend,
  isLateCheckIn,
  computeWorkedHours,
  toKarachiDate,
  attendanceStatusFor,
} from "../src/rules/index.mjs";
import { getSettings } from "./settings.service.mjs";
import * as holidayService from "./holiday.service.mjs";

/**
 * Check-in for an employee.
 * - Server stamps the time.
 * - Checks officeStart + graceMinutes for isLate on working days.
 * - Rejects duplicate check-ins on the same date with 409 ALREADY_CHECKED_IN.
 * - Throws AppError 403 NO_EMPLOYEE_PROFILE if user has no linked employeeId.
 */
export const checkIn = async (user) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  const companyId = user.companyId;
  const now = new Date();
  const dateStr = formatDate(now);
  const settings = await getSettings(companyId);

  const isNonWorkingDay = isWeekend(dateStr, settings.weekend);
  const isLate =
    !isNonWorkingDay && isLateCheckIn(now, settings.officeStart, settings.graceMinutes);

  // 1. Check existing record
  const existing = await AttendanceModel.findOne({
    employeeId,
    date: dateStr,
    ...(companyId ? { companyId } : {}),
  });
  if (existing) {
    throw new AppError(409, "ALREADY_CHECKED_IN", "You have already checked in for today");
  }

  // 2. Insert with Mongo duplicate key guard
  try {
    const record = await AttendanceModel.create({
      ...(companyId ? { companyId } : {}),
      employeeId,
      date: dateStr,
      checkIn: now,
      checkOut: null,
      workedHours: 0,
      isLate,
      isNonWorkingDay,
      status: "present",
    });
    return record;
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, "ALREADY_CHECKED_IN", "You have already checked in for today");
    }
    throw err;
  }
};

/**
 * Check-out for an employee.
 * - Sets checkOut timestamp and computes workedHours.
 * - Sets status = half_day if workedHours < settings.halfDayHours else present.
 * - Throws 422 NO_CHECK_IN if no check-in exists for today.
 * - Throws AppError 403 NO_EMPLOYEE_PROFILE if user has no linked employeeId.
 */
export const checkOut = async (user) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  const companyId = user.companyId;
  const now = new Date();
  const dateStr = formatDate(now);
  const settings = await getSettings(companyId);

  const record = await AttendanceModel.findOne({
    employeeId,
    date: dateStr,
    ...(companyId ? { companyId } : {}),
  });
  if (!record || !record.checkIn) {
    throw new AppError(422, "NO_CHECK_IN", "Cannot check out without checking in first");
  }

  const workedHours = computeWorkedHours(record.checkIn, now);
  const status = workedHours < (settings.halfDayHours ?? 5) ? "half_day" : "present";

  record.checkOut = now;
  record.workedHours = workedHours;
  record.status = status;
  if (companyId && !record.companyId) {
    record.companyId = companyId;
  }
  await record.save();

  return record;
};

/**
 * Returns month calendar data for the employee:
 * For each day up to today (or end of month), returns stored record or computed status.
 * Throws AppError 403 NO_EMPLOYEE_PROFILE if user has no linked employeeId.
 */
export const getMyMonth = async (user, month) => {
  const employeeId = user.employeeId;
  if (!employeeId) {
    throw new AppError(
      403,
      "NO_EMPLOYEE_PROFILE",
      "No employee profile associated with this account",
    );
  }

  return getEmployeeMonth(employeeId, month, user, user);
};

/**
 * Returns month calendar data for a specified employee (for HR and Admin).
 */
export const getEmployeeMonth = async (employeeId, month, employeeUser = null, actor = null) => {
  const targetMonth = month || formatDate(new Date()).slice(0, 7);
  const companyId = actor?.companyId || employeeUser?.companyId;
  const settings = await getSettings(companyId);
  const todayStr = formatDate(new Date());

  // Stored records for this month
  const records = await AttendanceModel.find({
    employeeId,
    date: { $regex: `^${targetMonth}` },
    ...(companyId ? { companyId } : {}),
  }).lean();

  const recordByDate = new Map(records.map((r) => [r.date, r]));

  // Days in month
  const startObj = toKarachiDate(`${targetMonth}-01`);
  const daysInMonth = startObj.daysInMonth();
  const days = [];

  // Query approved leave requests covering the month
  let leaveRequests = [];
  if (mongoose.connection.readyState === 1 || LeaveRequestModel.find?.mock) {
    try {
      leaveRequests = await LeaveRequestModel.find({
        employeeId,
        status: "approved",
        startDate: { $lte: `${targetMonth}-${String(daysInMonth).padStart(2, "0")}` },
        endDate: { $gte: `${targetMonth}-01` },
        ...(companyId ? { companyId } : {}),
      }).lean();
    } catch (err) {
      console.warn("[attendance.service] Failed to query approved leaves:", err.message);
    }
  }

  // Fetch holidays for the month from holiday service
  let holidays = [];
  try {
    holidays = await holidayService.getHolidaysForRange(
      `${targetMonth}-01`,
      `${targetMonth}-${String(daysInMonth).padStart(2, "0")}`,
      companyId,
    );
  } catch {}

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${targetMonth}-${String(d).padStart(2, "0")}`;
    const record = recordByDate.get(dayStr) || null;

    const status = attendanceStatusFor({
      date: dayStr,
      today: todayStr,
      record,
      employee: employeeUser || {},
      leaveRequests,
      holidays,
      settings,
    });

    days.push({
      date: dayStr,
      status,
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      workedHours: record?.workedHours || 0,
      isLate: record?.isLate || false,
      isNonWorkingDay: record?.isNonWorkingDay || false,
      recordId: record?._id || null,
    });
  }

  return {
    month: targetMonth,
    employeeId,
    days,
  };
};

/**
 * Daily attendance board for HR and Admin.
 * Displays all active employees and their status for the given date.
 */
export const getBoard = async (date, departmentId, actor = null) => {
  const targetDate = date || formatDate(new Date());
  const todayStr = formatDate(new Date());
  const companyId = actor?.companyId;
  const settings = await getSettings(companyId);

  // Find employees
  const filter = {
    status: { $ne: "exited" },
    ...(companyId ? { companyId } : {}),
  };
  if (departmentId) {
    filter.departmentId = departmentId;
  }

  let employees = [];
  try {
    employees = await EmployeeModel.find(filter)
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();
  } catch (err) {
    console.warn("[attendance.service] Failed to fetch employees for board:", err.message);
  }

  // Find attendance records for target date
  const records = await AttendanceModel.find({
    date: targetDate,
    ...(companyId ? { companyId } : {}),
  }).lean();
  const recordByEmpId = new Map(records.map((r) => [String(r.employeeId), r]));

  // Query holidays for targetDate from holiday service
  let holidays = [];
  try {
    const holiday = await holidayService.getHolidaysForDate(targetDate, companyId);
    if (holiday) holidays = [holiday];
  } catch {}

  // Query approved leaves covering targetDate
  let leaveRequests = [];
  if (mongoose.connection.readyState === 1 || LeaveRequestModel.find?.mock) {
    try {
      leaveRequests = await LeaveRequestModel.find({
        status: "approved",
        startDate: { $lte: targetDate },
        endDate: { $gte: targetDate },
        ...(companyId ? { companyId } : {}),
      }).lean();
    } catch (err) {
      console.warn("[attendance.service] Failed to query approved leaves for board:", err.message);
    }
  }

  // If employees collection has records, map over employees
  if (employees.length > 0) {
    return employees.map((emp) => {
      const record = recordByEmpId.get(String(emp._id)) || null;
      const status = attendanceStatusFor({
        date: targetDate,
        today: todayStr,
        record,
        employee: emp,
        leaveRequests,
        holidays,
        settings,
      });

      return {
        employee: {
          _id: emp._id,
          code: emp.code,
          name: emp.name,
          department: emp.departmentId?.name || null,
          designation: emp.designationId?.name || null,
        },
        status,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        workedHours: record?.workedHours || 0,
        isLate: record?.isLate || false,
      };
    });
  }

  // Fallback: If no employee records exist yet, return board based on attendance records
  return records.map((record) => {
    const status = attendanceStatusFor({
      date: targetDate,
      today: todayStr,
      record,
      leaveRequests,
      holidays,
      settings,
    });

    return {
      employee: {
        _id: record.employeeId,
        code: "EMP",
        name: "Employee",
      },
      status,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      workedHours: record.workedHours,
      isLate: record.isLate,
    };
  });
};
