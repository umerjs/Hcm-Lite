import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../server.mjs";
import {
  UserModel,
  DepartmentModel,
  DesignationModel,
  HolidayModel,
  LeaveTypeModel,
  EmployeeModel,
  LeaveRequestModel,
} from "../models/index.mjs";
import * as auditService from "../services/audit.service.mjs";
import * as holidayService from "../services/holiday.service.mjs";
import * as leavetypeService from "../services/leavetype.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice A2: Organization & User Management API", () => {
  const mockCompanyId = "671a11112222333344449999";
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const employeeUserId = "671a11112222333344440003";
  const employeeId = "671a11112222333344440004";
  const targetUserId = "671a11112222333344440005";

  let adminToken;
  let hrToken;
  let employeeToken;

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

    // Mock UserModel.findById().select() for requireAuth
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
      } else if (idStr === targetUserId) {
        role = "employee";
        empId = "671a11112222333344440006";
        email = "target@company.com";
      }

      const mockDoc = {
        _id: id,
        companyId: mockCompanyId,
        email,
        role,
        employeeId: empId,
        isActive: true,
        mustChangePassword: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: id, companyId: mockCompanyId, email, role, isActive: true, mustChangePassword: false }),
      };

      return {
        select: vi.fn().mockResolvedValue(mockDoc),
        lean: vi.fn().mockResolvedValue(mockDoc),
        then: (resolve) => resolve(mockDoc),
      };
    });
  });

  describe("1. RBAC & Org Data Permissions", () => {
    it("HR cannot write org data (403 FORBIDDEN)", async () => {
      // POST /departments
      const deptRes = await request(app)
        .post("/api/v1/departments")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ name: "Finance" });
      expect(deptRes.status).toBe(403);
      expect(deptRes.body.error?.code).toBe("FORBIDDEN");

      // POST /designations
      const desigRes = await request(app)
        .post("/api/v1/designations")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ name: "Accountant" });
      expect(desigRes.status).toBe(403);
      expect(desigRes.body.error?.code).toBe("FORBIDDEN");

      // POST /holidays
      const holRes = await request(app)
        .post("/api/v1/holidays")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ date: "2026-12-25", name: "Christmas" });
      expect(holRes.status).toBe(403);
      expect(holRes.body.error?.code).toBe("FORBIDDEN");

      // PUT /leave-types/:key
      const ltRes = await request(app)
        .put("/api/v1/leave-types/casual")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ yearlyQuota: 12 });
      expect(ltRes.status).toBe(403);
      expect(ltRes.body.error?.code).toBe("FORBIDDEN");

      // POST /users/hr
      const hrUserRes = await request(app)
        .post("/api/v1/users/hr")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ firstname: "Jane", lastname: "Doe", email: "jane@company.com" });
      expect(hrUserRes.status).toBe(403);
      expect(hrUserRes.body.error?.code).toBe("FORBIDDEN");

      // PATCH /users/:id/deactivate
      const deactRes = await request(app)
        .patch(`/api/v1/users/${targetUserId}/deactivate`)
        .set("Authorization", `Bearer ${hrToken}`);
      expect(deactRes.status).toBe(403);
      expect(deactRes.body.error?.code).toBe("FORBIDDEN");

      // POST /users/:id/reset-password
      const resetRes = await request(app)
        .post(`/api/v1/users/${targetUserId}/reset-password`)
        .set("Authorization", `Bearer ${hrToken}`);
      expect(resetRes.status).toBe(403);
      expect(resetRes.body.error?.code).toBe("FORBIDDEN");
    });

    it("Employee cannot access organization or user admin endpoints", async () => {
      const getDepts = await request(app)
        .get("/api/v1/departments")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(getDepts.status).toBe(403);

      const getHols = await request(app)
        .get("/api/v1/holidays")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(getHols.status).toBe(403);

      const getUsers = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(getUsers.status).toBe(403);
    });

    it("Employee, HR, and Admin can all read GET /leave-types", async () => {
      const empRes = await request(app)
        .get("/api/v1/leave-types")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(empRes.status).toBe(200);
      expect(Array.isArray(empRes.body.data)).toBe(true);

      const hrRes = await request(app)
        .get("/api/v1/leave-types")
        .set("Authorization", `Bearer ${hrToken}`);
      expect(hrRes.status).toBe(200);

      const adminRes = await request(app)
        .get("/api/v1/leave-types")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
    });

    it("HR can read departments and designations", async () => {
      vi.spyOn(DepartmentModel, "find").mockReturnValue({
        sort: () => ({ lean: () => Promise.resolve([{ _id: "dept1", name: "Engineering" }]) }),
      });
      vi.spyOn(DesignationModel, "find").mockReturnValue({
        populate: () => ({
          sort: () => ({ lean: () => Promise.resolve([{ _id: "des1", name: "Engineer" }]) }),
        }),
      });

      const deptsRes = await request(app)
        .get("/api/v1/departments")
        .set("Authorization", `Bearer ${hrToken}`);
      expect(deptsRes.status).toBe(200);
      expect(deptsRes.body.data).toHaveLength(1);

      const desigsRes = await request(app)
        .get("/api/v1/designations")
        .set("Authorization", `Bearer ${hrToken}`);
      expect(desigsRes.status).toBe(200);
      expect(desigsRes.body.data).toHaveLength(1);
    });
  });

  describe("2. Department Management", () => {
    it("Admin creates department successfully and audits the write", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const deptId = "671b00000000000000000001";

      vi.spyOn(DepartmentModel, "findOne").mockResolvedValue(null);
      vi.spyOn(DepartmentModel, "create").mockResolvedValue({
        _id: deptId,
        name: "Engineering",
        toObject: () => ({ _id: deptId, name: "Engineering" }),
      });

      const res = await request(app)
        .post("/api/v1/departments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Engineering" });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Engineering");

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DEPARTMENT_CREATED",
          entity: "departments",
          entityId: deptId,
          before: null,
          after: expect.objectContaining({ name: "Engineering" }),
        }),
      );
    });

    it("creating duplicate department returns 409 DUPLICATE_DEPARTMENT", async () => {
      vi.spyOn(DepartmentModel, "findOne").mockResolvedValue({
        _id: "existing_id",
        name: "Engineering",
      });

      const res = await request(app)
        .post("/api/v1/departments")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Engineering" });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_DEPARTMENT");
    });

    it("Admin updates department and audits the change", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const deptId = "671b00000000000000000001";

      const mockDoc = {
        _id: deptId,
        name: "R&D",
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { _id: this._id, name: this.name };
        },
      };

      vi.spyOn(DepartmentModel, "findById").mockResolvedValue(mockDoc);
      vi.spyOn(DepartmentModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/v1/departments/${deptId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Research & Development" });

      expect(res.status).toBe(200);
      expect(mockDoc.name).toBe("Research & Development");
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DEPARTMENT_UPDATED",
          entity: "departments",
          before: expect.objectContaining({ name: "R&D" }),
          after: expect.objectContaining({ name: "Research & Development" }),
        }),
      );
    });

    it("deleting department in use by employees returns 409 DEPARTMENT_IN_USE", async () => {
      const deptId = "671b00000000000000000001";
      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({ _id: deptId, name: "Engineering" });
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(3);

      const res = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DEPARTMENT_IN_USE");
    });

    it("deleting department in use by designations returns 409 DEPARTMENT_IN_USE", async () => {
      const deptId = "671b00000000000000000001";
      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({ _id: deptId, name: "Engineering" });
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(0);
      vi.spyOn(DesignationModel, "countDocuments").mockResolvedValue(2);

      const res = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DEPARTMENT_IN_USE");
    });

    it("deleting unused department succeeds and audits the deletion", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const deptId = "671b00000000000000000001";

      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({
        _id: deptId,
        name: "Old Dept",
        toObject: () => ({ _id: deptId, name: "Old Dept" }),
      });
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(0);
      vi.spyOn(DesignationModel, "countDocuments").mockResolvedValue(0);
      vi.spyOn(DepartmentModel, "deleteOne").mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .delete(`/api/v1/departments/${deptId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DEPARTMENT_DELETED",
          entity: "departments",
          entityId: deptId,
          after: null,
        }),
      );
    });
  });

  describe("3. Designation Management", () => {
    it("Admin creates designation successfully and audits the write", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const desigId = "671c00000000000000000001";

      vi.spyOn(DesignationModel, "findOne").mockResolvedValue(null);
      vi.spyOn(DesignationModel, "create").mockResolvedValue({
        _id: desigId,
        name: "Software Engineer",
        departmentId: null,
        toObject: () => ({ _id: desigId, name: "Software Engineer", departmentId: null }),
      });

      const res = await request(app)
        .post("/api/v1/designations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Software Engineer" });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Software Engineer");
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DESIGNATION_CREATED",
          entity: "designations",
          entityId: desigId,
        }),
      );
    });

    it("duplicate designation returns 409 DUPLICATE_DESIGNATION", async () => {
      vi.spyOn(DesignationModel, "findOne").mockResolvedValue({
        _id: "existing_desig",
        name: "Software Engineer",
      });

      const res = await request(app)
        .post("/api/v1/designations")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Software Engineer" });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_DESIGNATION");
    });

    it("deleting designation in use by employees returns 409 DESIGNATION_IN_USE", async () => {
      const desigId = "671c00000000000000000001";
      vi.spyOn(DesignationModel, "findById").mockResolvedValue({ _id: desigId, name: "Lead Dev" });
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(5);

      const res = await request(app)
        .delete(`/api/v1/designations/${desigId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DESIGNATION_IN_USE");
    });

    it("deleting unused designation succeeds and audits", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const desigId = "671c00000000000000000001";

      vi.spyOn(DesignationModel, "findById").mockResolvedValue({
        _id: desigId,
        name: "Intern",
        toObject: () => ({ _id: desigId, name: "Intern" }),
      });
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(0);
      vi.spyOn(DesignationModel, "deleteOne").mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .delete(`/api/v1/designations/${desigId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "DESIGNATION_DELETED",
          entity: "designations",
          entityId: desigId,
        }),
      );
    });
  });

  describe("4. Holiday Management & Calendar Logic", () => {
    it("Admin creates holiday and audits the record", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const holidayId = "671d00000000000000000001";

      vi.spyOn(HolidayModel, "findOne").mockResolvedValue(null);
      vi.spyOn(HolidayModel, "create").mockResolvedValue({
        _id: holidayId,
        date: "2026-12-25",
        name: "Quaid-e-Azam Day / Christmas",
        toObject: () => ({
          _id: holidayId,
          date: "2026-12-25",
          name: "Quaid-e-Azam Day / Christmas",
        }),
      });

      const res = await request(app)
        .post("/api/v1/holidays")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ date: "2026-12-25", name: "Quaid-e-Azam Day / Christmas" });

      expect(res.status).toBe(201);
      expect(res.body.data.date).toBe("2026-12-25");
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "HOLIDAY_CREATED",
          entity: "holidays",
          entityId: holidayId,
        }),
      );
    });

    it("creating holiday with duplicate date returns 409 DUPLICATE_HOLIDAY", async () => {
      vi.spyOn(HolidayModel, "findOne").mockResolvedValue({
        _id: "existing_hol",
        date: "2026-12-25",
        name: "Existing Holiday",
      });

      const res = await request(app)
        .post("/api/v1/holidays")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ date: "2026-12-25", name: "Another Holiday" });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_HOLIDAY");
    });

    it("Admin deletes holiday and audits the deletion", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const holidayId = "671d00000000000000000001";

      vi.spyOn(HolidayModel, "findById").mockResolvedValue({
        _id: holidayId,
        date: "2026-12-25",
        name: "Christmas",
        toObject: () => ({ _id: holidayId, date: "2026-12-25", name: "Christmas" }),
      });
      vi.spyOn(HolidayModel, "deleteOne").mockResolvedValue({ acknowledged: true });

      const res = await request(app)
        .delete(`/api/v1/holidays/${holidayId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "HOLIDAY_DELETED",
          entity: "holidays",
          entityId: holidayId,
        }),
      );
    });

    it("holidays change leave working-day counts", async () => {
      // 2026-10-26 (Monday) to 2026-10-30 (Friday) is 5 calendar weekdays.
      // With a holiday on 2026-10-28 (Wednesday), countWorkingDays should return 4 days.
      vi.spyOn(HolidayModel, "find").mockReturnValue({
        lean: () =>
          Promise.resolve([{ _id: "hol_1", date: "2026-10-28", name: "Special Midweek Holiday" }]),
      });

      // Verify authoritative getHolidaysForRange
      const holidays = await holidayService.getHolidaysForRange("2026-10-26", "2026-10-30");
      expect(holidays).toHaveLength(1);
      expect(holidays[0].date).toBe("2026-10-28");

      // Verify leave application across this range deducts 4 days instead of 5
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: () => Promise.resolve([]),
      });

      let savedLeave = null;
      vi.spyOn(LeaveRequestModel, "create").mockImplementation((doc) => {
        savedLeave = { _id: "leave_hol_test", ...doc };
        return Promise.resolve(savedLeave);
      });

      const res = await request(app)
        .post("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          type: "annual",
          startDate: "2026-10-26",
          endDate: "2026-10-30",
          reason: "Vacation including midweek holiday",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.days).toBe(4); // Excludes Wednesday 2026-10-28
    });
  });

  describe("5. Leave Types Quota Management", () => {
    it("Admin can update yearlyQuota for a leave type and audits the change", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockDoc = {
        _id: "lt_casual",
        key: "casual",
        name: "Casual Leave",
        yearlyQuota: 10,
        isPaid: true,
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return {
            _id: this._id,
            key: this.key,
            name: this.name,
            yearlyQuota: this.yearlyQuota,
            isPaid: this.isPaid,
          };
        },
      };

      vi.spyOn(LeaveTypeModel, "findOne").mockResolvedValue(mockDoc);

      const res = await request(app)
        .put("/api/v1/leave-types/casual")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ yearlyQuota: 12 });

      expect(res.status).toBe(200);
      expect(res.body.data.yearlyQuota).toBe(12);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LEAVE_TYPE_QUOTA_UPDATED",
          entity: "leavetypes",
          before: expect.objectContaining({ yearlyQuota: 10 }),
          after: expect.objectContaining({ yearlyQuota: 12 }),
        }),
      );
    });

    it("PUT /leave-types/:key rejects unknown leave types with 400", async () => {
      const res = await request(app)
        .put("/api/v1/leave-types/sabbatical")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ yearlyQuota: 30 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_LEAVE_TYPE");
    });
  });

  describe("6. User Management", () => {
    it("Admin creates HR login with random 12-char temp password and mustChangePassword: true", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");
      const createdHrId = "671e00000000000000000001";

      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);
      vi.spyOn(UserModel, "create").mockImplementation((doc) => {
        return Promise.resolve({
          _id: createdHrId,
          ...doc,
          toObject: () => ({ _id: createdHrId, ...doc }),
        });
      });

      const res = await request(app)
        .post("/api/v1/users/hr")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          firstname: "HR",
          lastname: "Manager",
          email: "hr.manager@company.com",
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("hr");
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.user.isActive).toBe(true);
      expect(typeof res.body.tempPassword).toBe("string");
      expect(res.body.tempPassword).toHaveLength(12);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "HR_USER_CREATED",
          entity: "users",
          entityId: createdHrId,
        }),
      );
    });

    it("POST /users/hr rejects duplicate email with 409 DUPLICATE_EMAIL", async () => {
      vi.spyOn(UserModel, "findOne").mockResolvedValue({
        _id: "existing_user",
        email: "hr.manager@company.com",
      });

      const res = await request(app)
        .post("/api/v1/users/hr")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          firstname: "HR",
          lastname: "Manager",
          email: "hr.manager@company.com",
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_EMAIL");
    });

    it("Admin views users list with role filter", async () => {
      vi.spyOn(UserModel, "find").mockReturnValue({
        select: () => ({
          sort: () => ({
            lean: () =>
              Promise.resolve([{ _id: hrId, email: "hr@company.com", role: "hr", isActive: true }]),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/users?role=hr")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe("hr");
    });

    it("Admin cannot deactivate their own account (422 CANNOT_DEACTIVATE_SELF)", async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("CANNOT_DEACTIVATE_SELF");
    });

    it("Admin deactivates another user and audits the action", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockTarget = {
        _id: targetUserId,
        companyId: mockCompanyId,
        email: "target@company.com",
        role: "employee",
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: targetUserId, companyId: mockCompanyId, isActive: false }),
      };

      vi.spyOn(UserModel, "findById").mockImplementation((id) => {
        const idStr = String(id);
        if (idStr === adminId) {
          return {
            select: vi.fn().mockResolvedValue({
              _id: adminId,
              companyId: mockCompanyId,
              email: "admin@company.com",
              role: "admin",
              isActive: true,
              mustChangePassword: false,
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue(mockTarget),
          then: (resolve) => resolve(mockTarget),
        };
      });

      const res = await request(app)
        .patch(`/api/v1/users/${targetUserId}/deactivate`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(mockTarget.isActive).toBe(false);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_DEACTIVATED",
          entity: "users",
          entityId: targetUserId,
          after: { isActive: false },
        }),
      );
    });

    it("deactivated user cannot log in (403 ACCOUNT_INACTIVE)", async () => {
      // UserModel.findOne returns an inactive user doc
      vi.spyOn(UserModel, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: targetUserId,
          email: "deactivated@company.com",
          password: "hashedPassword123",
          isActive: false, // Inactive
          mustChangePassword: false,
        }),
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "deactivated@company.com",
        password: "anyPassword123!",
      });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("ACCOUNT_INACTIVE");
    });

    it("Admin resets user password, forcing mustChangePassword: true, and returns 12-char temp password", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockTarget = {
        _id: targetUserId,
        companyId: mockCompanyId,
        email: "target@company.com",
        role: "employee",
        password: "oldHashedPassword",
        mustChangePassword: false,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(UserModel, "findById").mockImplementation((id) => {
        const idStr = String(id);
        if (idStr === adminId) {
          return {
            select: vi.fn().mockResolvedValue({
              _id: adminId,
              companyId: mockCompanyId,
              email: "admin@company.com",
              role: "admin",
              isActive: true,
              mustChangePassword: false,
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue(mockTarget),
          then: (resolve) => resolve(mockTarget),
        };
      });

      const res = await request(app)
        .post(`/api/v1/users/${targetUserId}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.tempPassword).toBe("string");
      expect(res.body.tempPassword).toHaveLength(12);
      expect(mockTarget.mustChangePassword).toBe(true);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "USER_PASSWORD_RESET",
          entity: "users",
          entityId: targetUserId,
          after: { mustChangePassword: true },
        }),
      );
    });

    it("reset forces password change on subsequent login", async () => {
      const rawTempPassword = "TempPass1234";
      const hashedTempPassword = await bcrypt.hash(rawTempPassword, 10);

      vi.spyOn(UserModel, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: targetUserId,
          companyId: mockCompanyId,
          email: "reset_user@company.com",
          password: hashedTempPassword,
          role: "employee",
          isActive: true,
          mustChangePassword: true, // Set to true by reset
        }),
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "reset_user@company.com",
        password: rawTempPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });
});
