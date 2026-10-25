import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import {
  UserModel,
  EmployeeModel,
  AttendanceModel,
  LeaveRequestModel,
  SettingsModel,
} from "../models/index.mjs";
import * as payrollService from "../services/payroll.service.mjs";
import * as pdfService from "../services/pdf.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice B3: Payroll & PDF Payslip API", () => {
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const mockCompanyId = "671a11112222333344449999";
  const employeeUserId = "671a11112222333344440003";
  const ownEmployeeId = "671a11112222333344440004";
  const otherEmployeeId = "671a11112222333344440005";

  let adminToken;
  let hrToken;
  let employeeToken;

  const mockEmployeeDoc = {
    _id: ownEmployeeId,
    companyId: mockCompanyId,
    code: "EMP-0001",
    name: "John Doe",
    email: "john.doe@company.com",
    departmentId: { _id: "dept1", name: "Engineering" },
    designationId: { _id: "desig1", name: "Senior Developer" },
    joinDate: "2026-01-01",
    exitDate: null,
    basicSalary: 100000,
    status: "active",
  };

  const mockOtherEmployeeDoc = {
    _id: otherEmployeeId,
    companyId: mockCompanyId,
    code: "EMP-0002",
    name: "Jane Smith",
    email: "jane.smith@company.com",
    departmentId: { _id: "dept1", name: "Engineering" },
    designationId: { _id: "desig2", name: "Lead Architect" },
    joinDate: "2026-01-01",
    exitDate: null,
    basicSalary: 150000,
    status: "active",
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    adminToken = jwt.sign(
      { _id: adminId, role: "admin", email: "admin@company.com", companyId: mockCompanyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    hrToken = jwt.sign(
      { _id: hrId, role: "hr", email: "hr@company.com", companyId: mockCompanyId },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    employeeToken = jwt.sign(
      { _id: employeeUserId, role: "employee", email: "emp@company.com", companyId: mockCompanyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Mock UserModel.findById() for requireAuth
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const idStr = String(id);
      let role = "employee";
      let empId = ownEmployeeId;
      let email = "emp@company.com";

      if (idStr === adminId) {
        role = "admin";
        empId = null;
        email = "admin@company.com";
      } else if (idStr === hrId) {
        role = "hr";
        empId = null;
        email = "hr@company.com";
      }

      const mockDoc = {
        _id: id,
        companyId: mockCompanyId,
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

  describe("1. Payroll Math & Rules Verification", () => {
    it("accurately computes Gross, Tax, and Net salary with Basic 100k", async () => {
      // Mock employee
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockEmployeeDoc),
          }),
        }),
      });

      // Mock attendance: perfect attendance
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const payroll = await payrollService.calculateEmployeePayroll(ownEmployeeId, "2026-10");

      // Math verification:
      // basic: 100,000
      // gross: 100,000 * 1.5 = 150,000
      // hra: 40,000
      // medical: 10,000
      expect(payroll.basic).toBe(100000);
      expect(payroll.gross).toBe(150000);
      expect(payroll.hra).toBe(40000);
      expect(payroll.medical).toBe(10000);

      // Annual Gross: 150,000 * 12 = 1,800,000
      // Tax: Slab 1.2M - 2.4M: 30,000 + (1,800,000 - 1,200,000) * 0.15 = 120,000
      // Monthly Tax: 120,000 / 12 = 10,000
      expect(payroll.annualGross).toBe(1800000);
      expect(payroll.annualTax).toBe(120000);
      expect(payroll.tax).toBe(10000);

      // Net: gross - monthlyTax = 150,000 - 10,000 = 140,000
      expect(payroll.net).toBe(140000);
    });

    it("evaluates late penalty toggle from settings", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockEmployeeDoc),
          }),
        }),
      });

      // 3 late check-ins in the month
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () =>
          Promise.resolve([
            { isLate: true, status: "present", date: "2026-10-01" },
            { isLate: true, status: "present", date: "2026-10-02" },
            { isLate: true, status: "present", date: "2026-10-05" },
          ]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      // Case A: latePenaltyEnabled = false (default)
      vi.spyOn(SettingsModel, "findById").mockResolvedValue({ latePenaltyEnabled: false });
      vi.spyOn(SettingsModel, "findOne").mockResolvedValue({ latePenaltyEnabled: false });

      const payrollPenaltyOff = await payrollService.calculateEmployeePayroll(
        ownEmployeeId,
        "2026-10",
      );
      expect(payrollPenaltyOff.lateCount).toBe(3);
      expect(payrollPenaltyOff.latePenaltyDays).toBe(0);
      expect(payrollPenaltyOff.deductions).toBe(0);
      expect(payrollPenaltyOff.net).toBe(140000);

      // Case B: latePenaltyEnabled = true
      vi.spyOn(SettingsModel, "findById").mockResolvedValue({ latePenaltyEnabled: true });
      vi.spyOn(SettingsModel, "findOne").mockResolvedValue({ latePenaltyEnabled: true });

      const payrollPenaltyOn = await payrollService.calculateEmployeePayroll(
        ownEmployeeId,
        "2026-10",
      );
      expect(payrollPenaltyOn.lateCount).toBe(3);
      expect(payrollPenaltyOn.latePenaltyDays).toBe(0.5); // 3 lates = 0.5 day
      expect(payrollPenaltyOn.deductions).toBeGreaterThan(0);
      expect(payrollPenaltyOn.net).toBeLessThan(140000);
    });
  });

  describe("2. PDF Generation Utility", () => {
    it("generates a valid PDF buffer with PDFKit", async () => {
      const mockPayrollData = {
        employee: {
          code: "EMP-0001",
          name: "John Doe",
          email: "john@company.com",
          department: "Engineering",
          designation: "Developer",
        },
        month: "2026-10",
        basic: 100000,
        hra: 40000,
        medical: 10000,
        gross: 150000,
        workingDays: 22,
        employedDays: 22,
        absentDays: 0,
        halfDays: 0,
        lateCount: 0,
        deductions: 0,
        tax: 10000,
        net: 140000,
      };

      const buffer = await pdfService.generatePayslipPdf(mockPayrollData, {
        companyName: "Acme Corp",
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);

      // Verify PDF header magic bytes "%PDF-"
      const header = buffer.subarray(0, 5).toString("ascii");
      expect(header).toBe("%PDF-");
    });
  });

  describe("3. Payroll Routes & RBAC Permissions", () => {
    it("GET /api/v1/payroll: Admin and HR can list payroll summaries", async () => {
      vi.spyOn(EmployeeModel, "find").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve([mockEmployeeDoc]),
          }),
        }),
      });

      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockEmployeeDoc),
          }),
        }),
      });

      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const resHr = await request(app)
        .get("/api/v1/payroll?month=2026-10")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(resHr.status).toBe(200);
      expect(resHr.body.data).toHaveLength(1);
      expect(resHr.body.month).toBe("2026-10");

      const resAdmin = await request(app)
        .get("/api/v1/payroll?month=2026-10")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data).toHaveLength(1);
    });

    it("GET /api/v1/payroll: Employee gets 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/payroll?month=2026-10")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("GET /api/v1/payroll/me: Employee views own payroll summary", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockEmployeeDoc),
          }),
        }),
      });
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const res = await request(app)
        .get("/api/v1/payroll/me?month=2026-10")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.basic).toBe(100000);
      expect(res.body.data.net).toBe(140000);
    });

    it("GET /api/v1/payroll/:employeeId/month/:month/pdf: Employee can download own payslip", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockEmployeeDoc),
          }),
        }),
      });
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const res = await request(app)
        .get(`/api/v1/payroll/${ownEmployeeId}/month/2026-10/pdf`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.body.length).toBeGreaterThan(500);

      const header = res.body.subarray(0, 5).toString("ascii");
      expect(header).toBe("%PDF-");
    });

    it("GET /api/v1/payroll/:employeeId/month/:month/pdf: Employee CANNOT download another employee's payslip (403)", async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/${otherEmployeeId}/month/2026-10/pdf`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("GET /api/v1/payroll/:employeeId/month/:month/pdf: Admin and HR can download any employee's payslip", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () => Promise.resolve(mockOtherEmployeeDoc),
          }),
        }),
      });
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      const resHr = await request(app)
        .get(`/api/v1/payroll/${otherEmployeeId}/month/2026-10/pdf`)
        .set("Authorization", `Bearer ${hrToken}`);

      expect(resHr.status).toBe(200);
      expect(resHr.headers["content-type"]).toBe("application/pdf");

      const resAdmin = await request(app)
        .get(`/api/v1/payroll/${otherEmployeeId}/month/2026-10/pdf`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.headers["content-type"]).toBe("application/pdf");
    });
  });
});
