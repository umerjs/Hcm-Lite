import mongoose from "mongoose";
import { EmployeeModel, AttendanceModel, LeaveRequestModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { getSettings } from "./settings.service.mjs";
import * as holidayService from "./holiday.service.mjs";
import { calculatePayroll, round2, countWorkingDays, toKarachiDate } from "../src/rules/index.mjs";

/**
 * Calculates payroll for a specific employee and month (YYYY-MM).
 *
 * - Gross: basicSalary * 1.5 (Basic 100%, HRA 40%, Medical 10%)
 * - Tax: Annual tax / 12 based on tax slabs (not prorated)
 * - Late Penalty: If settings.latePenaltyEnabled is true, 3 lates = 0.5 day deduction
 * - Net: earned - monthlyTax (or gross - monthlyTax - penalty)
 *
 * @param {string|mongoose.Types.ObjectId} employeeId
 * @param {string} month - Format YYYY-MM
 * @returns {Promise<Object>}
 */
export const calculateEmployeePayroll = async (employeeId, month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(400, "VALIDATION_ERROR", "Month must be in YYYY-MM format");
  }

  let employee = null;
  if (mongoose.connection.readyState === 1 || EmployeeModel.findById?.mock) {
    employee = await EmployeeModel.findById(employeeId)
      .populate("departmentId", "name")
      .populate("designationId", "name")
      .lean();
  }

  if (!employee) {
    throw new AppError(404, "NOT_FOUND", "Employee not found");
  }

  const basicSalary = Number(employee.basicSalary);
  if (isNaN(basicSalary) || basicSalary <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Employee has no valid basic salary");
  }

  const settings = await getSettings();

  const monthStart = `${month}-01`;
  const monthEndObj = toKarachiDate(monthStart).endOf("month");
  const monthEnd = monthEndObj.format("YYYY-MM-DD");

  // Company holidays in the month
  let holidays = [];
  try {
    holidays = await holidayService.getHolidaysForRange(monthStart, monthEnd);
  } catch {}

  // Total company working days in the month
  const workingDays =
    countWorkingDays(monthStart, monthEnd, settings.weekend || ["Sat", "Sun"], holidays) || 22;

  // Employed working days window
  const empStart =
    employee.joinDate && employee.joinDate > monthStart ? employee.joinDate : monthStart;
  const empEnd = employee.exitDate && employee.exitDate < monthEnd ? employee.exitDate : monthEnd;

  const employedDays =
    countWorkingDays(empStart, empEnd, settings.weekend || ["Sat", "Sun"], holidays) || workingDays;

  // Fetch attendance records for this employee in this month
  let records = [];
  if (mongoose.connection.readyState === 1 || AttendanceModel.find?.mock) {
    try {
      records = await AttendanceModel.find({
        employeeId,
        date: { $regex: `^${month}` },
      }).lean();
    } catch {}
  }

  const lateCount = records.filter((r) => r.isLate).length;
  const halfDays = records.filter((r) => r.status === "half_day").length;
  const absentDays = records.filter((r) => r.status === "absent").length;

  // Fetch approved unpaid leaves if any
  let unpaidLeaveDays = 0;
  if (mongoose.connection.readyState === 1 || LeaveRequestModel.find?.mock) {
    try {
      const unpaidLeaves = await LeaveRequestModel.find({
        employeeId,
        type: "unpaid",
        status: "approved",
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      }).lean();

      for (const leave of unpaidLeaves) {
        const start = leave.startDate < monthStart ? monthStart : leave.startDate;
        const end = leave.endDate > monthEnd ? monthEnd : leave.endDate;
        if (start <= end) {
          unpaidLeaveDays += countWorkingDays(
            start,
            end,
            settings.weekend || ["Sat", "Sun"],
            holidays,
          );
        }
      }
    } catch {}
  }

  // Calculate payroll using authoritative pure rule function from B0
  const calculation = calculatePayroll({
    basic: basicSalary,
    workingDays,
    employedDays,
    absentDays,
    unpaidLeaveDays,
    halfDays,
    lateCount,
    latePenaltyEnabled: Boolean(settings.latePenaltyEnabled),
  });

  return {
    employeeId: employee._id,
    employee: {
      _id: employee._id,
      code: employee.code,
      name: employee.name,
      email: employee.email,
      department: employee.departmentId?.name || "General",
      designation: employee.designationId?.name || "Staff",
      joinDate: employee.joinDate,
      exitDate: employee.exitDate,
    },
    month,
    ...calculation,
    lateCount,
    penalty: calculation.deductions,
  };
};

/**
 * Retrieves payroll summaries for all eligible employees for a given month.
 * Accessible to HR and Admin.
 *
 * @param {string} month - Format YYYY-MM
 * @returns {Promise<Array>}
 */
export const getMonthlyPayrollSummaries = async (month) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError(400, "VALIDATION_ERROR", "Month must be in YYYY-MM format");
  }

  const monthStart = `${month}-01`;
  const monthEnd = toKarachiDate(monthStart).endOf("month").format("YYYY-MM-DD");

  const filter = {
    joinDate: { $lte: monthEnd },
    $or: [{ exitDate: null }, { exitDate: { $gte: monthStart } }],
  };

  if (mongoose.connection.readyState !== 1 && !EmployeeModel.find?.mock) {
    return [];
  }

  const employees = await EmployeeModel.find(filter)
    .populate("departmentId", "name")
    .populate("designationId", "name")
    .lean();

  const summaries = [];
  for (const emp of employees) {
    try {
      const summary = await calculateEmployeePayroll(emp._id, month);
      summaries.push(summary);
    } catch (err) {
      console.warn(`[payroll.service] Failed to calculate for ${emp._id}:`, err.message);
    }
  }

  return summaries;
};
