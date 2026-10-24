import { toKarachiDate, formatDate } from "./time.mjs";

/**
 * countWorkingDays(start, end, weekend, holidays)
 * Counts working days from start to end (inclusive) excluding weekend days and holidays.
 *
 * @param {string|Date} start - e.g. "2026-10-26"
 * @param {string|Date} end - e.g. "2026-10-27"
 * @param {string[]} [weekend=["Sat", "Sun"]]
 * @param {(string|{date: string})[]} [holidays=[]]
 * @returns {number}
 */
export const countWorkingDays = (start, end, weekend = ["Sat", "Sun"], holidays = []) => {
  let curr = toKarachiDate(start).startOf("day");
  const targetEnd = toKarachiDate(end).startOf("day");

  if (curr.isAfter(targetEnd)) return 0;

  const holidaySet = new Set(holidays.map((h) => (typeof h === "string" ? h : h.date)));

  let count = 0;
  while (!curr.isAfter(targetEnd)) {
    const dayName = curr.format("ddd");
    const dateStr = curr.format("YYYY-MM-DD");

    const isWknd = weekend.includes(dayName);
    const isHol = holidaySet.has(dateStr);

    if (!isWknd && !isHol) {
      count++;
    }

    curr = curr.add(1, "day");
  }

  return count;
};

/**
 * Helper to count total working days in a calendar month (YYYY-MM).
 */
export const getMonthWorkingDays = (
  monthStr, // "2026-10"
  weekend = ["Sat", "Sun"],
  holidays = [],
) => {
  const start = `${monthStr}-01`;
  const end = toKarachiDate(start).endOf("month").format("YYYY-MM-DD");
  return countWorkingDays(start, end, weekend, holidays);
};
