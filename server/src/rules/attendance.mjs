import { formatDate, isWeekend } from "./time.mjs";

/**
 * Computes attendance status for an employee on a given date at read time.
 *
 * @param {Object} params
 * @param {string|Date} params.date - Date to check (YYYY-MM-DD)
 * @param {string|Date} [params.today] - Today's date (defaults to current date in PKT)
 * @param {Object|null} [params.record] - Stored attendance record if any
 * @param {Object} [params.employee={}] - Employee details (joinDate, exitDate)
 * @param {Array} [params.leaveRequests=[]] - Approved leave requests
 * @param {Array} [params.holidays=[]] - Company holidays
 * @param {Object} [params.settings={}] - Settings (weekend, halfDayHours)
 * @returns {"present"|"half_day"|"missing_checkout"|"absent"|"on_leave"|"weekend"|"holiday"|"none"}
 */
export const attendanceStatusFor = ({
  date,
  today = new Date(),
  record = null,
  employee = {},
  leaveRequests = [],
  holidays = [],
  settings = {},
}) => {
  const weekend = settings.weekend || ["Sat", "Sun"];
  const halfDayHours = settings.halfDayHours ?? 5;
  const dateStr = formatDate(date);
  const todayStr = formatDate(today);

  // 1. If an attendance record exists
  if (record) {
    if (record.checkIn && record.checkOut) {
      const worked = record.workedHours !== undefined ? record.workedHours : 0;
      return worked < halfDayHours ? "half_day" : "present";
    }

    if (record.checkIn && !record.checkOut) {
      if (dateStr === todayStr) {
        return "present";
      }
      if (dateStr < todayStr) {
        return "missing_checkout";
      }
    }
  }

  // 2. If NO attendance record exists:
  const holidaySet = new Set(holidays.map((h) => (typeof h === "string" ? h : h.date)));

  if (holidaySet.has(dateStr)) {
    return "holiday";
  }

  if (isWeekend(dateStr, weekend)) {
    return "weekend";
  }

  // Check approved leave covering this date
  const onLeave = leaveRequests.some((lr) => {
    if (lr.status !== "approved") return false;
    const start = formatDate(lr.startDate);
    const end = formatDate(lr.endDate);
    return dateStr >= start && dateStr <= end;
  });

  if (onLeave) {
    return "on_leave";
  }

  // Check if it's a past working day for an active/employed employee
  if (dateStr < todayStr) {
    const joinDate = employee.joinDate ? formatDate(employee.joinDate) : null;
    const exitDate = employee.exitDate ? formatDate(employee.exitDate) : null;

    if (!joinDate || dateStr >= joinDate) {
      if (!exitDate || dateStr <= exitDate) {
        return "absent";
      }
    }
  }

  return "none";
};
