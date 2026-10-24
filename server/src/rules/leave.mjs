import { toKarachiDate, formatDate } from "./time.mjs";
import { countWorkingDays } from "./workdays.mjs";

/**
 * Validates a leave application request against authoritative HCM Lite business rules.
 *
 * Rules:
 * - endDate must be >= startDate
 * - Must not span across multiple calendar years (422)
 * - Working days must be > 0 (all weekend/holiday ranges return error 422)
 * - No overlap with existing pending or approved leave requests (422)
 * - used + pending + requested days <= quota (for limited quota types) (422)
 *
 * @param {Object} params
 * @param {string|Date} params.startDate
 * @param {string|Date} params.endDate
 * @param {number|null} [params.quota] - null for unlimited
 * @param {number} [params.usedDays=0]
 * @param {number} [params.pendingDays=0]
 * @param {Array} [params.existingRequests=[]]
 * @param {string[]} [params.weekend=["Sat", "Sun"]]
 * @param {Array} [params.holidays=[]]
 * @returns {{ valid: boolean, days: number, error?: { code: string, message: string, status: number } }}
 */
export const validateLeaveRequest = ({
  startDate,
  endDate,
  today = null,
  quota = null,
  usedDays = 0,
  pendingDays = 0,
  existingRequests = [],
  weekend = ["Sat", "Sun"],
  holidays = [],
}) => {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  if (endStr < startStr) {
    return {
      valid: false,
      days: 0,
      error: {
        status: 400,
        code: "INVALID_DATES",
        message: "End date cannot be earlier than start date",
      },
    };
  }

  // Past start date check: start date must be today or later
  const todayStr = today ? formatDate(today) : null;
  if (todayStr && startStr < todayStr) {
    return {
      valid: false,
      days: 0,
      error: {
        status: 422,
        code: "PAST_DATE_LEAVE",
        message: "Leave start date cannot be in the past",
      },
    };
  }

  // Cross calendar year check (PRD Section 1: reject with 422)
  const startYear = toKarachiDate(startStr).year();
  const endYear = toKarachiDate(endStr).year();
  if (startYear !== endYear) {
    return {
      valid: false,
      days: 0,
      error: {
        status: 422,
        code: "CROSS_YEAR_LEAVE",
        message: "Leave requests spanning two calendar years are not allowed",
      },
    };
  }

  // Calculate working days
  const days = countWorkingDays(startStr, endStr, weekend, holidays);
  if (days <= 0) {
    return {
      valid: false,
      days: 0,
      error: {
        status: 422,
        code: "NO_WORKING_DAYS",
        message: "Selected date range contains 0 working days",
      },
    };
  }

  // Overlap check with approved or pending requests
  const hasOverlap = existingRequests.some((req) => {
    if (!["approved", "pending"].includes(req.status)) return false;
    const reqStart = formatDate(req.startDate);
    const reqEnd = formatDate(req.endDate);
    return !(endStr < reqStart || startStr > reqEnd);
  });

  if (hasOverlap) {
    return {
      valid: false,
      days,
      error: {
        status: 422,
        code: "LEAVE_OVERLAP",
        message: "Requested leave dates overlap with an existing approved or pending request",
      },
    };
  }

  // Balance check (if limited quota)
  if (quota !== null && quota !== undefined) {
    if (usedDays + pendingDays + days > quota) {
      return {
        valid: false,
        days,
        error: {
          status: 422,
          code: "EXCEEDS_QUOTA",
          message: `Insufficient leave balance (quota: ${quota}, used: ${usedDays}, pending: ${pendingDays}, requested: ${days})`,
        },
      };
    }
  }

  return {
    valid: true,
    days,
  };
};
