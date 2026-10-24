import { describe, it, expect } from "vitest";
import {
  isLateCheckIn,
  computeWorkedHours,
  countWorkingDays,
  attendanceStatusFor,
  taxSlab,
  calculatePayroll,
  validateLeaveRequest,
} from "../src/rules/index.mjs";

describe("1. Attendance Status & Time Rules", () => {
  it("evaluates check-in timeliness: 09:15 is on-time (isLate = false)", () => {
    // officeStart="09:00", graceMinutes=15
    const late = isLateCheckIn("09:15", "09:00", 15);
    expect(late).toBe(false);
  });

  it("evaluates check-in timeliness: 09:16 is late (isLate = true)", () => {
    const late = isLateCheckIn("09:16", "09:00", 15);
    expect(late).toBe(true);
  });

  it("evaluates check-in timeliness with full ISO/Date in Karachi timezone", () => {
    // 04:15 UTC = 09:15 PKT (+05:00) -> on time
    const onTimeUtc = new Date("2026-10-23T04:15:00.000Z");
    expect(isLateCheckIn(onTimeUtc, "09:00", 15)).toBe(false);

    // 04:16 UTC = 09:16 PKT -> late
    const lateUtc = new Date("2026-10-23T04:16:00.000Z");
    expect(isLateCheckIn(lateUtc, "09:00", 15)).toBe(true);
  });

  it("computes worked hours: 09:00 to 13:59 is 4.98 hours", () => {
    const hours = computeWorkedHours("09:00", "13:59");
    expect(hours).toBeCloseTo(4.98, 2);
  });

  it("computes worked hours: 09:00 to 14:00 is 5.00 hours", () => {
    const hours = computeWorkedHours("09:00", "14:00");
    expect(hours).toBe(5);
  });

  it("determines half_day status when worked hours < 5.00", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23",
      today: "2026-10-24",
      record: {
        checkIn: "09:00",
        checkOut: "13:59",
        workedHours: 4.98,
      },
      settings: { halfDayHours: 5 },
    });
    expect(status).toBe("half_day");
  });

  it("determines present status when worked hours >= 5.00", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23",
      today: "2026-10-24",
      record: {
        checkIn: "09:00",
        checkOut: "14:00",
        workedHours: 5.0,
      },
      settings: { halfDayHours: 5 },
    });
    expect(status).toBe("present");
  });

  it("determines missing_checkout for past date with check-in and no check-out", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23",
      today: "2026-10-24",
      record: {
        checkIn: "09:00",
        checkOut: null,
      },
    });
    expect(status).toBe("missing_checkout");
  });

  it("determines present for today's open record (check-in with no check-out yet)", () => {
    const status = attendanceStatusFor({
      date: "2026-10-24",
      today: "2026-10-24",
      record: {
        checkIn: "09:00",
        checkOut: null,
      },
    });
    expect(status).toBe("present");
  });

  it("determines absent for past working day with no record and no leave", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23", // Friday (working day)
      today: "2026-10-24",
      record: null,
      employee: { joinDate: "2026-10-01" },
      leaveRequests: [],
      holidays: [],
      settings: { weekend: ["Sat", "Sun"] },
    });
    expect(status).toBe("absent");
  });

  it("determines on_leave for past working day covered by approved leave", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23",
      today: "2026-10-24",
      record: null,
      employee: { joinDate: "2026-10-01" },
      leaveRequests: [{ startDate: "2026-10-22", endDate: "2026-10-23", status: "approved" }],
      holidays: [],
      settings: { weekend: ["Sat", "Sun"] },
    });
    expect(status).toBe("on_leave");
  });

  it("determines weekend for weekend date with no record (never absent)", () => {
    const status = attendanceStatusFor({
      date: "2026-10-24", // Saturday
      today: "2026-10-24",
      record: null,
      employee: { joinDate: "2026-10-01" },
      settings: { weekend: ["Sat", "Sun"] },
    });
    expect(status).toBe("weekend");
  });

  it("determines holiday for holiday date with no record (never absent)", () => {
    const status = attendanceStatusFor({
      date: "2026-10-23",
      today: "2026-10-24",
      record: null,
      employee: { joinDate: "2026-10-01" },
      holidays: ["2026-10-23"],
      settings: { weekend: ["Sat", "Sun"] },
    });
    expect(status).toBe("holiday");
  });
});

describe("2. Leave Working Days & Validation Rules", () => {
  const weekend = ["Sat", "Sun"];

  it("counts plain weekday range: Mon 2026-10-26 to Tue 2026-10-27 = 2 days", () => {
    const days = countWorkingDays("2026-10-26", "2026-10-27", weekend, []);
    expect(days).toBe(2);
  });

  it("counts range spanning weekend: Fri 2026-10-30 to Mon 2026-11-02 = 2 days (Fri, Mon)", () => {
    const days = countWorkingDays("2026-10-30", "2026-11-02", weekend, []);
    expect(days).toBe(2);
  });

  it("counts range spanning weekend with holiday: Fri 2026-10-30 to Mon 2026-11-02 (holiday on 11-02) = 1 day", () => {
    const days = countWorkingDays("2026-10-30", "2026-11-02", weekend, ["2026-11-02"]);
    expect(days).toBe(1);
  });

  it("counts all-weekend range: Sat 2026-10-24 to Sun 2026-10-25 = 0 days", () => {
    const days = countWorkingDays("2026-10-24", "2026-10-25", weekend, []);
    expect(days).toBe(0);
  });

  it("rejects all-weekend range with 422: Sat 2026-10-24 to Sun 2026-10-25", () => {
    const result = validateLeaveRequest({
      startDate: "2026-10-24",
      endDate: "2026-10-25",
      quota: 10,
      weekend,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
  });

  it("rejects leave overlapping existing approved request with 422", () => {
    const result = validateLeaveRequest({
      startDate: "2026-10-27",
      endDate: "2026-10-28",
      existingRequests: [{ startDate: "2026-10-26", endDate: "2026-10-27", status: "approved" }],
      quota: 10,
      weekend,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
    expect(result.error?.code).toBe("LEAVE_OVERLAP");
  });

  it("rejects over-balance request with 422: quota 10, used 9 approved, request 2 days", () => {
    // 2026-10-26 to 2026-10-27 is 2 days. 9 used + 2 requested = 11 > 10.
    const result = validateLeaveRequest({
      startDate: "2026-10-26",
      endDate: "2026-10-27",
      quota: 10,
      usedDays: 9,
      pendingDays: 0,
      weekend,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
    expect(result.error?.code).toBe("EXCEEDS_QUOTA");
  });

  it("rejects cross-year leave with 422: 2026-12-30 to 2027-01-04", () => {
    const result = validateLeaveRequest({
      startDate: "2026-12-30",
      endDate: "2027-01-04",
      quota: 14,
      weekend,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
    expect(result.error?.code).toBe("CROSS_YEAR_LEAVE");
  });

  it("rejects past start date with 422 PAST_DATE_LEAVE", () => {
    const result = validateLeaveRequest({
      startDate: "2026-10-20",
      endDate: "2026-10-22",
      today: "2026-10-25",
      quota: 10,
      weekend,
    });
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(422);
    expect(result.error?.code).toBe("PAST_DATE_LEAVE");
  });
});

describe("3. Tax Slab on Annual Gross (gross * 12)", () => {
  it("case 1: basic 30,000 -> gross 45,000 -> annual 540,000 -> tax 0", () => {
    const annualGross = 45000 * 12; // 540,000
    const annualTax = taxSlab(annualGross);
    expect(annualTax).toBe(0);
    expect(annualTax / 12).toBe(0);
  });

  it("case 2: basic 40,000 -> gross 60,000 -> annual 720,000 -> annual tax 6,000, monthly 500", () => {
    const annualGross = 60000 * 12; // 720,000
    const annualTax = taxSlab(annualGross);
    expect(annualTax).toBe(6000);
    expect(annualTax / 12).toBe(500);
  });

  it("case 3: basic 100,000 -> gross 150,000 -> annual 1,800,000 -> annual tax 120,000, monthly 10,000", () => {
    const annualGross = 150000 * 12; // 1,800,000
    const annualTax = taxSlab(annualGross);
    expect(annualTax).toBe(120000);
    expect(annualTax / 12).toBe(10000);
  });

  it("case 4: basic 200,000 -> gross 300,000 -> annual 3,600,000 -> annual tax 510,000, monthly 42,500", () => {
    const annualGross = 300000 * 12; // 3,600,000
    const annualTax = taxSlab(annualGross);
    expect(annualTax).toBe(510000);
    expect(annualTax / 12).toBe(42500);
  });

  it("case 5: basic 400,000 -> gross 600,000 -> annual 7,200,000 -> annual tax 1,770,000, monthly 147,500", () => {
    const annualGross = 600000 * 12; // 7,200,000
    const annualTax = taxSlab(annualGross);
    expect(annualTax).toBe(1770000);
    expect(annualTax / 12).toBe(147500);
  });

  describe("Boundary checks", () => {
    it("boundary 600,000 -> 0", () => {
      expect(taxSlab(600000)).toBe(0);
    });

    it("boundary 1,200,000 -> 30,000", () => {
      expect(taxSlab(1200000)).toBe(30000);
    });

    it("boundary 2,400,000 -> 210,000", () => {
      expect(taxSlab(2400000)).toBe(210000);
    });

    it("boundary 3,600,000 -> 510,000", () => {
      expect(taxSlab(3600000)).toBe(510000);
    });
  });
});

describe("4. Payroll Cases (October 2026: 22 working days)", () => {
  it("Full attendance: basic 40,000", () => {
    const result = calculatePayroll({
      basic: 40000,
      workingDays: 22,
      employedDays: 22,
      absentDays: 0,
      unpaidLeaveDays: 0,
      halfDays: 0,
    });

    expect(result.gross).toBe(60000);
    expect(result.deductions).toBe(0);
    expect(result.tax).toBe(500);
    expect(result.net).toBe(59500);
  });

  it("Mixed attendance: basic 100,000, 2 absent, 1 half day, 0 unpaid", () => {
    const result = calculatePayroll({
      basic: 100000,
      workingDays: 22,
      employedDays: 22,
      absentDays: 2,
      unpaidLeaveDays: 0,
      halfDays: 1,
    });

    expect(result.perDay).toBeCloseTo(6818.18, 2);
    expect(result.deductDays).toBe(2.5);
    expect(result.deductions).toBeCloseTo(17045.45, 2);
    expect(result.tax).toBe(10000);
    expect(result.net).toBeCloseTo(122954.55, 2);
  });

  it("Joiner: basic 100,000, 11 working days employed, 0 absences", () => {
    const result = calculatePayroll({
      basic: 100000,
      workingDays: 22,
      employedDays: 11,
      absentDays: 0,
      unpaidLeaveDays: 0,
      halfDays: 0,
    });

    expect(result.earned).toBeCloseTo(75000.0, 2);
    expect(result.tax).toBe(10000); // not prorated for joiners
    expect(result.net).toBeCloseTo(65000.0, 2);
  });

  it("Unpaid leave: basic 100,000, 3 unpaid leave days", () => {
    const result = calculatePayroll({
      basic: 100000,
      workingDays: 22,
      employedDays: 22,
      absentDays: 0,
      unpaidLeaveDays: 3,
      halfDays: 0,
    });

    expect(result.deductDays).toBe(3);
    expect(result.deductions).toBeCloseTo(20454.55, 2);
    expect(result.tax).toBe(10000);
    expect(result.net).toBeCloseTo(119545.45, 2);
  });
});
