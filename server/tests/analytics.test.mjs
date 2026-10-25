import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import {
  UserModel,
  EmployeeModel,
  AttendanceModel,
  LeaveRequestModel,
  CorrectionModel,
} from "../models/index.mjs";
import * as leaveService from "../services/leave.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice B4: Analytics & Metrics API", () => {
  const companyId = "671a11112222333344449999";
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const employeeUserId = "671a11112222333344440003";
  const employeeId = "671a11112222333344440004";

  let adminToken;
  let hrToken;
  let employeeToken;
  let userWithoutEmpToken;

  beforeEach(() => {
    vi.restoreAllMocks();

    adminToken = jwt.sign(
      { _id: adminId, role: "admin", email: "admin@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    hrToken = jwt.sign(
      { _id: hrId, role: "hr", email: "hr@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    employeeToken = jwt.sign(
      { _id: employeeUserId, role: "employee", email: "emp@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    userWithoutEmpToken = jwt.sign(
      { _id: "671a11112222333344440099", role: "employee", email: "noemp@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Mock UserModel.findById() for requireAuth
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const idStr = String(id);
      let role = "employee";
      let empId = employeeId;
      let email = "emp@company.com";

      if (idStr === adminId) {
        role = "admin";
        empId = null;
        email = "admin@company.com";
      } else if (idStr === hrId) {
        role = "hr";
        empId = null;
        email = "hr@company.com";
      } else if (idStr === "671a11112222333344440099") {
        role = "employee";
        empId = null; // No employee profile
        email = "noemp@company.com";
      }

      const mockDoc = {
        _id: id,
        companyId,
        email,
        role,
        employeeId: empId,
        isActive: true,
        mustChangePassword: false,
      };

      return {
        select: vi.fn().mockResolvedValue(mockDoc),
        lean: vi.fn().mockResolvedValue(mockDoc),
        then: (resolve) => resolve(mockDoc),
      };
    });
  });

  describe("1. HR Dashboard Metrics (GET /api/v1/analytics/hr)", () => {
    it("aggregates the exact counts needed for HrDashboardResponse", async () => {
      // Mock employee counts
      vi.spyOn(EmployeeModel, "countDocuments").mockImplementation((filter) => {
        if (!filter || !filter.status) {
          return Promise.resolve(10); // totalEmployees = 10
        }
        if (filter.status) {
          return Promise.resolve(8); // activeEmployees = 8
        }
        return Promise.resolve(0);
      });

      // Mock attendance records for today (5 present, 2 late among them)
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () =>
          Promise.resolve([
            { status: "present", isLate: false, checkIn: "2026-10-25T04:00:00Z" },
            { status: "present", isLate: true, checkIn: "2026-10-25T04:20:00Z" },
            { status: "present", isLate: false, checkIn: "2026-10-25T03:55:00Z" },
            { status: "half_day", isLate: true, checkIn: "2026-10-25T04:30:00Z" },
            { status: "present", isLate: false, checkIn: "2026-10-25T03:50:00Z" },
          ]),
      });

      // Mock approved leaves for today (1 employee on leave)
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([{ employeeId: "emp_leave_1", status: "approved" }]),
      });

      // Mock pending leaves and corrections
      vi.spyOn(LeaveRequestModel, "countDocuments").mockImplementation((filter) => {
        if (filter && filter.status === "pending") {
          return Promise.resolve(3); // pendingLeaves = 3
        }
        return Promise.resolve(0);
      });

      vi.spyOn(CorrectionModel, "countDocuments").mockImplementation((filter) => {
        if (filter && filter.status === "pending") {
          return Promise.resolve(2); // pendingCorrections = 2
        }
        return Promise.resolve(0);
      });

      const res = await request(app)
        .get("/api/v1/analytics/hr?date=2026-10-25")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(res.status).toBe(200);

      // Verify exact shape of HrDashboardResponse
      expect(res.body.totalEmployees).toBe(10);
      expect(res.body.activeEmployees).toBe(8);

      expect(res.body.todayAttendance).toBeDefined();
      expect(res.body.todayAttendance.present).toBe(5);
      expect(res.body.todayAttendance.late).toBe(2);
      expect(res.body.todayAttendance.onLeave).toBe(1);
      // absent = active (8) - (present (5) + onLeave (1)) = 2
      expect(res.body.todayAttendance.absent).toBe(2);

      expect(res.body.pendingLeaves).toBe(3);
      expect(res.body.pendingCorrections).toBe(2);
    });

    it("Admin can also access GET /api/v1/analytics/hr", async () => {
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(5);
      vi.spyOn(AttendanceModel, "find").mockReturnValue({ lean: () => Promise.resolve([]) });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({ lean: () => Promise.resolve([]) });
      vi.spyOn(LeaveRequestModel, "countDocuments").mockResolvedValue(0);
      vi.spyOn(CorrectionModel, "countDocuments").mockResolvedValue(0);

      const res = await request(app)
        .get("/api/v1/analytics/hr")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalEmployees).toBe(5);
    });

    it("Employee calling GET /api/v1/analytics/hr gets 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/hr")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });
  });

  describe("2. Employee Personal Metrics (GET /api/v1/analytics/me)", () => {
    it("aggregates the employee's personal stats for EmployeeDashboardResponse", async () => {
      // Mock employee attendance records for month: 15 present, 2 late, 1 explicit absent
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () =>
          Promise.resolve([
            ...Array(13).fill({ status: "present", isLate: false, checkIn: "2026-10-01" }),
            { status: "present", isLate: true, checkIn: "2026-10-14" },
            { status: "half_day", isLate: true, checkIn: "2026-10-15" },
            { status: "absent", isLate: false },
          ]),
      });

      // Mock leaveService.getBalance
      vi.spyOn(leaveService, "getBalance").mockResolvedValue({
        year: "2026",
        balances: [
          { type: "annual", remaining: 12 },
          { type: "sick", remaining: 7 },
          { type: "casual", remaining: 9 },
        ],
      });

      // Mock pending requests (1 leave + 1 correction = 2)
      vi.spyOn(LeaveRequestModel, "countDocuments").mockResolvedValue(1);
      vi.spyOn(CorrectionModel, "countDocuments").mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/analytics/me?month=2026-10")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);

      // Verify exact shape of EmployeeDashboardResponse
      expect(res.body.currentMonthAttendance).toBeDefined();
      expect(res.body.currentMonthAttendance.present).toBe(15);
      expect(res.body.currentMonthAttendance.late).toBe(2);
      expect(res.body.currentMonthAttendance.absent).toBe(1);

      expect(res.body.leaveBalances).toBeDefined();
      expect(res.body.leaveBalances.annual).toBe(12);
      expect(res.body.leaveBalances.sick).toBe(7);
      expect(res.body.leaveBalances.casual).toBe(9);

      expect(res.body.pendingRequests).toBe(2);
    });

    it("user without an employee profile calling GET /analytics/me gets 403 NO_EMPLOYEE_PROFILE", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/me")
        .set("Authorization", `Bearer ${userWithoutEmpToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("NO_EMPLOYEE_PROFILE");
    });
  });
});
