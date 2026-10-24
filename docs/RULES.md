# HCM Lite — Authoritative Business Rules & Worked Examples

## 1. Business Rules

### Settings

- `companyName, timezone="Asia/Karachi", officeStart="09:00", graceMinutes=15, halfDayHours=5, weekend=["Sat","Sun"], officeLat, officeLng, radiusMeters=150, latePenaltyEnabled=false`.

### Attendance

- Check-in: server time, one record per employee per date (`YYYY-MM-DD`).
- `isLate = checkInTime > officeStart + grace` on a working day (evaluated at minute precision in office timezone).
- Check-out: sets `checkOut`, `workedHours`; `status = half_day` if `workedHours < halfDayHours` else `present`.
- Read-time status for a date:
  - If record exists with check-in and check-out: `status` (`present` or `half_day`).
  - If record exists with check-in and NO check-out:
    - If date is today: `present`.
    - If date is past: `missing_checkout`.
  - If NO record exists:
    - If date is holiday: `holiday`.
    - If date is weekend: `weekend`.
    - If approved leave covers this date: `on_leave`.
    - If past working day (on or after joinDate, and before exitDate if exited): `absent`.
    - Otherwise (e.g. future working day or not yet joined/already exited): `none`.

### Leave

- `countWorkingDays(start, end, weekend, holidays)`: counts days in `[start, end]` (inclusive) that are not in `weekend` and not in `holidays`.
- Validation rules:
  - `end >= start`
  - single calendar year only (reject if start year != end year with 422)
  - `workingDays > 0` (if 0, e.g. all weekend/holiday, reject with 422)
  - no overlap with existing pending or approved requests (reject with 422)
  - `usedApproved + pending + requested <= quota` (for limited leave types, reject with 422)

### Payroll

- Salary structure:
  - `basic`
  - `hra = 0.4 * basic`
  - `medical = 0.1 * basic`
  - `gross = 1.5 * basic`
- Working days & proration:
  - `workingDays = weekdays in month - holidays`
  - `employedDays = working days between max(joinDate, monthStart) and min(exitDate, monthEnd)`
  - `perDay = gross / workingDays`
  - `deductDays = absentDays + unpaidLeaveDays + 0.5 * halfDays + (latePenaltyEnabled ? Math.floor(lateCount / 3) * 0.5 : 0)`
  - `earned = perDay * (employedDays - deductDays)`
- Tax:
  - `annualGross = gross * 12`
  - Tax slabs on annual gross:
    - `0 - 600,000`: 0
    - `600,001 - 1,200,000`: `5% of (annualGross - 600,000)`
    - `1,200,001 - 2,400,000`: `30,000 + 15% of (annualGross - 1,200,000)`
    - `2,400,001 - 3,600,000`: `210,000 + 25% of (annualGross - 2,400,000)`
    - `> 3,600,000`: `510,000 + 35% of (annualGross - 3,600,000)`
  - `annualTax = taxSlab(annualGross)`
  - `monthlyTax = annualTax / 12` (not prorated for joiners)
- Net pay:
  - `net = earned - monthlyTax`
  - Round currency values to 2 decimal places at the end.

---

## 2. Worked Examples & Test Cases

### Attendance Status

All dates assume Saturday 2026-10-24 as today, weekend `["Sat", "Sun"]`, default officeStart="09:00", grace=15, halfDayHours=5.

| Case             | Input                                                   | Expected                  |
| ---------------- | ------------------------------------------------------- | ------------------------- |
| On time          | office 09:00, grace 15, check-in 09:15                  | isLate = false            |
| Late             | check-in 09:16                                          | isLate = true             |
| Half day         | in 09:00, out 13:59 (4.98 h)                            | status = half_day         |
| Full day         | in 09:00, out 14:00 (5.00 h)                            | status = present          |
| Missing checkout | past date (e.g. 2026-10-23), check-in, no check-out     | status = missing_checkout |
| Today open       | today (2026-10-24), check-in, no check-out              | status = present          |
| Absent           | past working day (e.g. 2026-10-23), no record, no leave | status = absent           |
| On leave         | past working day, no record, approved leave             | status = on_leave         |
| Weekend          | Saturday 2026-10-24, no record                          | status = weekend          |
| Holiday          | 2026-10-23 declared holiday, no record                  | status = holiday          |

### Leave Working Days

| Case         | Input                                                   | Expected |
| ------------ | ------------------------------------------------------- | -------- |
| Plain        | Mon 2026-10-26 to Tue 2026-10-27                        | 2 days   |
| Over weekend | Fri 2026-10-30 to Mon 2026-11-02                        | 2 days   |
| With holiday | Fri 2026-10-30 to Mon 2026-11-02, holiday on 2026-11-02 | 1 day    |
| All weekend  | Sat 2026-10-24 to Sun 2026-10-25                        | 0 days   |

### Tax Slab on Annual Gross (gross * 12)

| Basic (monthly) | Gross (monthly) | Annual Gross | Annual Tax | Monthly Tax |
| --------------- | --------------- | ------------ | ---------- | ----------- |
| 30,000          | 45,000          | 540,000      | 0          | 0           |
| 40,000          | 60,000          | 720,000      | 6,000      | 500         |
| 100,000         | 150,000         | 1,800,000    | 120,000    | 10,000      |
| 200,000         | 300,000         | 3,600,000    | 510,000    | 42,500      |
| 400,000         | 600,000         | 7,200,000    | 1,770,000  | 147,500     |

Boundaries:

- 600,000 -> 0
- 1,200,000 -> 30,000
- 2,400,000 -> 210,000
- 3,600,000 -> 510,000

### Payroll Cases (October 2026: 22 working days)

| Case            | Inputs                                              | Expected                                                                         |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Full attendance | basic 40,000                                        | gross 60,000, deductions 0, tax 500, net 59,500                                  |
| Mixed           | basic 100,000, 2 absent, 1 half day, 0 unpaid       | perDay 6,818.18, deductDays 2.5, deduction 17,045.45, tax 10,000, net 122,954.55 |
| Joiner          | basic 100,000, 11 working days employed, 0 absences | earned 75,000.00, tax 10,000, net 65,000.00                                      |
| Unpaid leave    | basic 100,000, 3 unpaid leave days                  | deduction 20,454.55, net 119,545.45                                              |
