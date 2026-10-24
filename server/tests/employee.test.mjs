import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../server.mjs";
import {
  UserModel,
  EmployeeModel,
  DepartmentModel,
  DesignationModel,
  CounterModel,
} from "../models/index.mjs";
import * as auditService from "../services/audit.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice A3: Employee Management API", () => {
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const employeeUserId = "671a11112222333344440003";
  const ownEmployeeId = "671a11112222333344440004";
  const otherEmployeeId = "671a11112222333344440005";
  const deptId = "671a11112222333344440010";
  const desigId = "671a11112222333344440020";

  let adminToken;
  let hrToken;
  let employeeToken;

  beforeEach(() => {
    vi.restoreAllMocks();

    adminToken = jwt.sign(
      { _id: adminId, role: "admin", email: "admin@company.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    hrToken = jwt.sign({ _id: hrId, role: "hr", email: "hr@company.com" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    employeeToken = jwt.sign(
      { _id: employeeUserId, role: "employee", email: "emp@company.com" },
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
        email,
        role,
        employeeId: empId,
        isActive: true,
        mustChangePassword: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({ _id: id, email, role, isActive: true, mustChangePassword: false }),
      };

      return {
        select: vi.fn().mockResolvedValue(mockDoc),
        lean: vi.fn().mockResolvedValue(mockDoc),
        then: (resolve) => resolve(mockDoc),
      };
    });
  });

  describe("1. Employee Registration (POST /employees) & Login", () => {
    it("creating an employee creates a working login that must change password", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({ _id: deptId, name: "Engineering" });
      vi.spyOn(DesignationModel, "findById").mockResolvedValue({ _id: desigId, name: "Developer" });
      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);
      vi.spyOn(EmployeeModel, "findOne").mockResolvedValue(null);

      let createdUserDoc = null;
      vi.spyOn(UserModel, "create").mockImplementation((doc) => {
        createdUserDoc = { ...doc };
        return Promise.resolve(createdUserDoc);
      });

      let createdEmpDoc = null;
      vi.spyOn(EmployeeModel, "create").mockImplementation((doc) => {
        createdEmpDoc = { ...doc, toObject: () => ({ ...doc }) };
        return Promise.resolve(createdEmpDoc);
      });

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "John Doe",
          email: "john.doe@company.com",
          phone: "03001234567",
          address: "Shahrah-e-Faisal, Karachi",
          gender: "male",
          departmentId: deptId,
          designationId: desigId,
          joinDate: "2026-10-25",
          basicSalary: 75000,
        });

      expect(res.status).toBe(201);
      expect(res.body.employee).toBeDefined();
      expect(res.body.employee.name).toBe("John Doe");
      expect(res.body.employee.email).toBe("john.doe@company.com");
      expect(res.body.employee.code).toMatch(/^EMP-\d{4}$/);
      expect(typeof res.body.tempPassword).toBe("string");
      expect(res.body.tempPassword).toHaveLength(12);

      // Verify created user document properties
      expect(createdUserDoc.role).toBe("employee");
      expect(createdUserDoc.mustChangePassword).toBe(true);
      expect(createdUserDoc.isActive).toBe(true);
      expect(String(createdUserDoc.employeeId)).toBe(String(createdEmpDoc._id));

      // Verify audit call
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EMPLOYEE_CREATED",
          entity: "employees",
          before: null,
          after: expect.objectContaining({
            email: "john.doe@company.com",
            basicSalary: 75000,
          }),
        }),
      );

      // Verify that this employee can log in using the temporary password
      // and that the login response demands mustChangePassword: true
      vi.spyOn(UserModel, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: createdUserDoc._id,
          email: "john.doe@company.com",
          password: createdUserDoc.password,
          role: "employee",
          isActive: true,
          mustChangePassword: true,
        }),
      });

      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "john.doe@company.com",
        password: res.body.tempPassword,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      expect(loginRes.body.user.mustChangePassword).toBe(true);
      expect(loginRes.body.user.role).toBe("employee");
    });

    it("rolls back user creation if employee creation fails", async () => {
      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({ _id: deptId, name: "Engineering" });
      vi.spyOn(DesignationModel, "findById").mockResolvedValue({ _id: desigId, name: "Developer" });
      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);
      vi.spyOn(EmployeeModel, "findOne").mockResolvedValue(null);

      const deleteUserSpy = vi
        .spyOn(UserModel, "deleteOne")
        .mockResolvedValue({ acknowledged: true });

      vi.spyOn(UserModel, "create").mockResolvedValue({
        _id: "user_to_rollback",
        email: "fail@company.com",
      });

      // Force EmployeeModel.create to throw
      vi.spyOn(EmployeeModel, "create").mockRejectedValue(new Error("DB disk write failed"));

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "Rollback User",
          email: "fail@company.com",
          departmentId: deptId,
          designationId: desigId,
          joinDate: "2026-10-25",
          basicSalary: 60000,
        });

      expect(res.status).toBe(500);
      expect(deleteUserSpy).toHaveBeenCalledWith({ _id: "user_to_rollback" });
    });

    it("rejects non-existent department with 404", async () => {
      vi.spyOn(DepartmentModel, "findById").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "John Doe",
          email: "john@company.com",
          departmentId: "671a11112222333344449999",
          designationId: desigId,
          joinDate: "2026-10-25",
          basicSalary: 50000,
        });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    });

    it("rejects basicSalary <= 0 with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "John Doe",
          email: "john@company.com",
          departmentId: deptId,
          designationId: desigId,
          joinDate: "2026-10-25",
          basicSalary: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects duplicate employee email with 409 DUPLICATE_EMAIL", async () => {
      vi.spyOn(DepartmentModel, "findById").mockResolvedValue({ _id: deptId });
      vi.spyOn(DesignationModel, "findById").mockResolvedValue({ _id: desigId });
      vi.spyOn(UserModel, "findOne").mockResolvedValue({ _id: "existing_user" });

      const res = await request(app)
        .post("/api/v1/employees")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "John Doe",
          email: "existing@company.com",
          departmentId: deptId,
          designationId: desigId,
          joinDate: "2026-10-25",
          basicSalary: 50000,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("2. Directory & Scope Permissions (GET /employees & GET /employees/:id)", () => {
    it("an Employee cannot list employees (403 FORBIDDEN)", async () => {
      const res = await request(app)
        .get("/api/v1/employees")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("an Employee cannot read another employee (403 FORBIDDEN)", async () => {
      const res = await request(app)
        .get(`/api/v1/employees/${otherEmployeeId}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("an Employee CAN read their own employee profile (200 OK)", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () =>
              Promise.resolve({
                _id: ownEmployeeId,
                name: "Myself",
                email: "emp@company.com",
                basicSalary: 70000,
              }),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/employees/${ownEmployeeId}`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(ownEmployeeId);
      expect(res.body.data.name).toBe("Myself");
    });

    it("Admin and HR can list employees with search and pagination", async () => {
      vi.spyOn(EmployeeModel, "countDocuments").mockResolvedValue(1);
      vi.spyOn(EmployeeModel, "find").mockReturnValue({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () =>
                    Promise.resolve([
                      {
                        _id: ownEmployeeId,
                        code: "EMP-0001",
                        name: "Alice Developer",
                        email: "alice@company.com",
                      },
                    ]),
                }),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/employees?q=Alice&page=1&pageSize=10")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
    });

    it("Admin and HR can view any employee record", async () => {
      vi.spyOn(EmployeeModel, "findById").mockReturnValue({
        populate: () => ({
          populate: () => ({
            lean: () =>
              Promise.resolve({
                _id: otherEmployeeId,
                name: "Other Employee",
                email: "other@company.com",
              }),
          }),
        }),
      });

      const res = await request(app)
        .get(`/api/v1/employees/${otherEmployeeId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Other Employee");
    });
  });

  describe("3. Employee Updates & Salary Management", () => {
    it("HR updates employee details and audits the change", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockEmployee = {
        _id: ownEmployeeId,
        name: "Old Name",
        phone: "03000000000",
        address: "Old Address",
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { _id: this._id, name: this.name, phone: this.phone, address: this.address };
        },
      };

      vi.spyOn(EmployeeModel, "findById").mockResolvedValue(mockEmployee);

      const res = await request(app)
        .patch(`/api/v1/employees/${ownEmployeeId}`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          name: "New Name",
          phone: "03111111111",
          address: "Clifton, Karachi",
        });

      expect(res.status).toBe(200);
      expect(mockEmployee.name).toBe("New Name");
      expect(mockEmployee.phone).toBe("03111111111");

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EMPLOYEE_UPDATED",
          entity: "employees",
          entityId: ownEmployeeId,
        }),
      );
    });

    it("setting status to exited sets exitDate and deactivates the user", async () => {
      const mockUser = {
        _id: employeeUserId,
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockEmployee = {
        _id: ownEmployeeId,
        userId: employeeUserId,
        status: "active",
        exitDate: null,
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { _id: this._id, status: this.status, exitDate: this.exitDate };
        },
      };

      vi.spyOn(EmployeeModel, "findById").mockResolvedValue(mockEmployee);

      // Handle both UserModel.findById(admin/hr) for requireAuth and UserModel.findById(userId) for deactivation
      vi.spyOn(UserModel, "findById").mockImplementation((id) => {
        const idStr = String(id);
        if (idStr === hrId) {
          return {
            select: vi.fn().mockResolvedValue({
              _id: hrId,
              role: "hr",
              isActive: true,
              mustChangePassword: false,
            }),
          };
        }
        return Promise.resolve(mockUser);
      });

      const res = await request(app)
        .patch(`/api/v1/employees/${ownEmployeeId}`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ status: "exited" });

      expect(res.status).toBe(200);
      expect(mockEmployee.status).toBe("exited");
      expect(mockEmployee.exitDate).toBeDefined();
      expect(mockUser.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("PUT /employees/:id/salary updates basicSalary with before and after audit", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockEmployee = {
        _id: ownEmployeeId,
        basicSalary: 60000,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmployeeModel, "findById").mockResolvedValue(mockEmployee);

      const res = await request(app)
        .put(`/api/v1/employees/${ownEmployeeId}/salary`)
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ basicSalary: 85000 });

      expect(res.status).toBe(200);
      expect(mockEmployee.basicSalary).toBe(85000);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "EMPLOYEE_SALARY_UPDATED",
          entity: "employees",
          before: { basicSalary: 60000 },
          after: { basicSalary: 85000 },
        }),
      );
    });

    it("an Employee cannot update another employee or change salary (403)", async () => {
      const res = await request(app)
        .put(`/api/v1/employees/${ownEmployeeId}/salary`)
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ basicSalary: 100000 });

      expect(res.status).toBe(403);
    });
  });

  describe("4. Employee Self Profile (PATCH /me/profile)", () => {
    it("updates phone and address successfully", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      const mockEmployee = {
        _id: ownEmployeeId,
        phone: "03000000000",
        address: "Old Address",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmployeeModel, "findById").mockResolvedValue(mockEmployee);

      const res = await request(app)
        .patch("/api/v1/me/profile")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          phone: "03222222222",
          address: "Gulshan-e-Iqbal, Karachi",
        });

      expect(res.status).toBe(200);
      expect(mockEmployee.phone).toBe("03222222222");
      expect(mockEmployee.address).toBe("Gulshan-e-Iqbal, Karachi");

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "PROFILE_UPDATED",
          entity: "employees",
          after: {
            phone: "03222222222",
            address: "Gulshan-e-Iqbal, Karachi",
          },
        }),
      );
    });

    it("profile update rejects role or salary fields with 400 VALIDATION_ERROR", async () => {
      // Trying to inject role
      const res1 = await request(app)
        .patch("/api/v1/me/profile")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          phone: "03222222222",
          role: "admin",
        });

      expect(res1.status).toBe(400);
      expect(res1.body.error?.code).toBe("VALIDATION_ERROR");

      // Trying to inject basicSalary
      const res2 = await request(app)
        .patch("/api/v1/me/profile")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          address: "New Address",
          basicSalary: 200000,
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error?.code).toBe("VALIDATION_ERROR");

      // Trying to inject salary
      const res3 = await request(app)
        .patch("/api/v1/me/profile")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          salary: 200000,
        });

      expect(res3.status).toBe(400);
      expect(res3.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("5. Role Guard Restrictions", () => {
    it("HR cannot change settings (403 FORBIDDEN)", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          officeStart: "08:30",
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });
  });
});
