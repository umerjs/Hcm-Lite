import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Asia/Karachi";

/**
 * Returns a dayjs object anchored in the office timezone (Asia/Karachi).
 */
export const toKarachiDate = (dateOrString) => {
  return dayjs(dateOrString).tz(DEFAULT_TIMEZONE);
};

/**
 * Formats a Date or date string to YYYY-MM-DD in Asia/Karachi.
 */
export const formatDate = (dateOrString) => {
  return toKarachiDate(dateOrString).format("YYYY-MM-DD");
};

/**
 * Formats a Date or date string to HH:mm in Asia/Karachi.
 */
export const formatTime = (dateOrString) => {
  return toKarachiDate(dateOrString).format("HH:mm");
};

/**
 * Returns true if date falls on a weekend day (e.g. Sat or Sun).
 */
export const isWeekend = (dateOrString, weekend = ["Sat", "Sun"]) => {
  const d = toKarachiDate(dateOrString);
  return weekend.includes(d.format("ddd"));
};

/**
 * Checks if check-in is late compared to officeStart + graceMinutes.
 * Evaluates at minute precision in Karachi timezone.
 * E.g., officeStart = "09:00", graceMinutes = 15 -> cutoff is 09:15.
 * Check-in at 09:15 is on-time (false).
 * Check-in at 09:16 is late (true).
 */
export const isLateCheckIn = (checkIn, officeStart = "09:00", graceMinutes = 15) => {
  let inMinutes;

  if (typeof checkIn === "string" && /^\d{1,2}:\d{2}$/.test(checkIn.trim())) {
    const [h, m] = checkIn.trim().split(":").map(Number);
    inMinutes = h * 60 + m;
  } else {
    const d = toKarachiDate(checkIn);
    inMinutes = d.hour() * 60 + d.minute();
  }

  const [startH, startM] = officeStart.split(":").map(Number);
  const cutoffMinutes = startH * 60 + startM + graceMinutes;

  return inMinutes > cutoffMinutes;
};

/**
 * Computes worked hours between check-in and check-out.
 * E.g., 09:00 to 13:59 -> 4.98 hours.
 * 09:00 to 14:00 -> 5.00 hours.
 */
export const computeWorkedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  let inMinutes;
  let outMinutes;

  if (typeof checkIn === "string" && /^\d{1,2}:\d{2}$/.test(checkIn.trim())) {
    const [h, m] = checkIn.trim().split(":").map(Number);
    inMinutes = h * 60 + m;
  } else {
    const d = toKarachiDate(checkIn);
    inMinutes = d.hour() * 60 + d.minute();
  }

  if (typeof checkOut === "string" && /^\d{1,2}:\d{2}$/.test(checkOut.trim())) {
    const [h, m] = checkOut.trim().split(":").map(Number);
    outMinutes = h * 60 + m;
  } else {
    const d = toKarachiDate(checkOut);
    outMinutes = d.hour() * 60 + d.minute();
  }

  let diffMinutes = outMinutes - inMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // Cross-midnight edge case
  }

  const hours = diffMinutes / 60;
  return Math.round((hours + Number.EPSILON) * 100) / 100;
};
