import { taxSlab } from "./tax.mjs";

/**
 * Rounds a number to 2 decimal places.
 */
export const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Calculates monthly payroll for an employee.
 *
 * Rules:
 * - basic
 * - hra = 0.4 * basic
 * - medical = 0.1 * basic
 * - gross = 1.5 * basic
 * - perDay = gross / workingDays
 * - deductDays = absentDays + unpaidLeaveDays + 0.5 * halfDays (+ 0.5 per 3 lates if latePenaltyEnabled)
 * - earned = perDay * (employedDays - deductDays)
 * - annualGross = gross * 12
 * - annualTax = taxSlab(annualGross)
 * - monthlyTax = annualTax / 12 (not prorated for joiners)
 * - net = earned - monthlyTax
 *
 * All calculations maintain full precision internally; only final numbers are rounded to 2 decimals.
 *
 * @param {Object} params
 * @param {number} params.basic - Monthly basic salary
 * @param {number} params.workingDays - Total company working days in the month
 * @param {number} [params.employedDays] - Days employee was employed during month
 * @param {number} [params.absentDays=0]
 * @param {number} [params.unpaidLeaveDays=0]
 * @param {number} [params.halfDays=0]
 * @param {number} [params.lateCount=0]
 * @param {boolean} [params.latePenaltyEnabled=false]
 * @returns {Object}
 */
export const calculatePayroll = ({
  basic,
  workingDays,
  employedDays,
  absentDays = 0,
  unpaidLeaveDays = 0,
  halfDays = 0,
  lateCount = 0,
  latePenaltyEnabled = false,
}) => {
  if (!basic || basic <= 0) {
    throw new Error("basic salary must be greater than 0");
  }
  if (!workingDays || workingDays <= 0) {
    throw new Error("workingDays must be greater than 0");
  }

  const effectiveEmployedDays = employedDays !== undefined ? employedDays : workingDays;

  const hra = 0.4 * basic;
  const medical = 0.1 * basic;
  const gross = 1.5 * basic;

  const perDay = gross / workingDays;

  // 3 lates = 0.5 day penalty if enabled
  const latePenaltyDays =
    latePenaltyEnabled && lateCount >= 3 ? Math.floor(lateCount / 3) * 0.5 : 0;

  const deductDays = absentDays + unpaidLeaveDays + 0.5 * halfDays + latePenaltyDays;

  const deductions = perDay * deductDays;
  const earned = perDay * (effectiveEmployedDays - deductDays);

  const annualGross = gross * 12;
  const annualTax = taxSlab(annualGross);
  const monthlyTax = annualTax / 12;

  const net = earned - monthlyTax;

  return {
    basic: round2(basic),
    hra: round2(hra),
    medical: round2(medical),
    gross: round2(gross),
    workingDays,
    employedDays: effectiveEmployedDays,
    perDay: round2(perDay),
    absentDays,
    unpaidLeaveDays,
    halfDays,
    latePenaltyDays,
    deductDays: round2(deductDays),
    deductions: round2(deductions),
    earned: round2(earned),
    annualGross: round2(annualGross),
    annualTax: round2(annualTax),
    tax: round2(monthlyTax),
    net: round2(net),
  };
};
