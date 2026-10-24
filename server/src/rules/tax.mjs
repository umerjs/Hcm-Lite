/**
 * Computes annual income tax based on the authoritative tax slabs in docs/RULES.md.
 *
 * Slabs on annual gross:
 *   0 - 600,000: 0
 *   600,000 - 1,200,000: 5% of excess over 600,000
 *   1,200,000 - 2,400,000: 30,000 + 15% of excess over 1,200,000
 *   2,400,000 - 3,600,000: 210,000 + 25% of excess over 2,400,000
 *   above 3,600,000: 510,000 + 35% of excess over 3,600,000
 *
 * @param {number} annualGross
 * @returns {number}
 */
export const taxSlab = (annualGross) => {
  if (annualGross <= 600000) {
    return 0;
  }
  if (annualGross <= 1200000) {
    return (annualGross - 600000) * 0.05;
  }
  if (annualGross <= 2400000) {
    return 30000 + (annualGross - 1200000) * 0.15;
  }
  if (annualGross <= 3600000) {
    return 210000 + (annualGross - 2400000) * 0.25;
  }
  return 510000 + (annualGross - 3600000) * 0.35;
};

/**
 * Calculates monthly tax from annual tax (annual / 12).
 */
export const monthlyTaxFromAnnual = (annualTax) => {
  return annualTax / 12;
};
