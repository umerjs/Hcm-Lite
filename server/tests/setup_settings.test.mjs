import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../server.mjs";
import { UserModel, SettingsModel, LeaveTypeModel, AuditLogModel } from "../models/index.mjs";
import { initAdminOnBoot } from "../services/setup.service.mjs";
import * as auditService from "../services/audit.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice A1: First-Run Setup, Settings & Audit API", () => {
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const employeeId = "671a11112222333344440003";

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
      { _id: employeeId, role: "employee", email: "emp@company.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Mock UserModel.findById().select() for requireAuth
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const idStr = String(id);
      let role = "employee";
      if (idStr === adminId) role = "admin";
      else if (idStr === hrId) role = "hr";

      return {
        select: vi.fn().mockResolvedValue({
          _id: id,
          email: `${role}@company.com`,
          role,
          isActive: true,
          mustChangePassword: false,
        }),
      };
    });

    vi.spyOn(UserModel, "deleteOne").mockResolvedValue({ acknowledged: true });
    vi.spyOn(SettingsModel, "deleteOne").mockResolvedValue({ acknowledged: true });
  });

  describe("1. First-Run Setup (/setup)", () => {
    it("GET /api/v1/setup/status returns { needsSetup: true } when no admin exists", async () => {
      vi.spyOn(UserModel, "countDocuments").mockResolvedValue(0);

      const res = await request(app).get("/api/v1/setup/status");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ needsSetup: true });
    });

    it("GET /api/v1/setup/status returns { needsSetup: false } when admin exists", async () => {
      vi.spyOn(UserModel, "countDocuments").mockResolvedValue(1);

      const res = await request(app).get("/api/v1/setup/status");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ needsSetup: false });
    });

    it("setup works once, creates admin user, settings, leave types, and audit record", async () => {
      // No admin exists initially
      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);

      const createdUser = {
        _id: adminId,
        firstname: "Alice",
        lastname: "Administrator",
        email: "alice@company.com",
        role: "admin",
        mustChangePassword: false,
      };
      vi.spyOn(UserModel, "create").mockResolvedValue(createdUser);

      const createdSettings = {
        _id: "company_settings",
        companyName: "Acme Corp",
        timezone: "Asia/Karachi",
        officeStart: "09:00",
        graceMinutes: 15,
        halfDayHours: 5,
        weekend: ["Sat", "Sun"],
        officeLat: null,
        officeLng: null,
        radiusMeters: 150,
        latePenaltyEnabled: false,
      };
      vi.spyOn(SettingsModel, "create").mockResolvedValue(createdSettings);
      vi.spyOn(LeaveTypeModel, "updateOne").mockResolvedValue({ acknowledged: true });
      const auditSpy = vi.spyOn(auditService, "audit");

      const res = await request(app).post("/api/v1/setup").send({
        companyName: "Acme Corp",
        adminName: "Alice Administrator",
        adminEmail: "alice@company.com",
        adminPassword: "Password123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Setup completed successfully");
      expect(res.body.user.email).toBe("alice@company.com");
      expect(res.body.settings.companyName).toBe("Acme Corp");
      expect(LeaveTypeModel.updateOne).toHaveBeenCalledTimes(4); // annual, sick, casual, unpaid
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "setup.completed",
          entity: "setup",
          actor: null,
          actorRole: "system",
        }),
      );
    });

    it("setup rolls back completely if a later step fails, keeping needsSetup true so a subsequent setup succeeds", async () => {
      // Step A: Setup is attempted, admin is created, but SettingsModel.create fails
      let adminInDb = null;
      vi.spyOn(UserModel, "findOne").mockImplementation(() => Promise.resolve(adminInDb));
      vi.spyOn(UserModel, "countDocuments").mockImplementation(() =>
        Promise.resolve(adminInDb ? 1 : 0),
      );

      vi.spyOn(UserModel, "create").mockImplementation((userData) => {
        adminInDb = { _id: adminId, ...userData };
        return Promise.resolve(adminInDb);
      });

      vi.spyOn(UserModel, "deleteOne").mockImplementation(({ _id }) => {
        if (adminInDb && String(adminInDb._id) === String(_id)) {
          adminInDb = null;
        }
        return Promise.resolve({ acknowledged: true, deletedCount: 1 });
      });

      // Force failure on SettingsModel.create
      vi.spyOn(SettingsModel, "create").mockRejectedValue(new Error("Disk full or schema error"));

      const failRes = await request(app).post("/api/v1/setup").send({
        companyName: "Acme Corp",
        adminName: "Alice Admin",
        adminEmail: "alice@company.com",
        adminPassword: "Password123!",
      });

      expect(failRes.status).toBe(500);

      // Verify rollback: admin was deleted, needsSetup remains true!
      const statusRes = await request(app).get("/api/v1/setup/status");
      expect(statusRes.status).toBe(200);
      expect(statusRes.body).toEqual({ needsSetup: true });

      // Step B: Second setup call now succeeds cleanly
      vi.spyOn(SettingsModel, "create").mockResolvedValue({
        _id: "company_settings",
        companyName: "Acme Corp",
      });
      vi.spyOn(LeaveTypeModel, "updateOne").mockResolvedValue({ acknowledged: true });

      const successRes = await request(app).post("/api/v1/setup").send({
        companyName: "Acme Corp",
        adminName: "Alice Admin",
        adminEmail: "alice@company.com",
        adminPassword: "Password123!",
      });

      expect(successRes.status).toBe(201);
      expect(successRes.body.message).toBe("Setup completed successfully");
    });

    it("second setup call returns 409 ALREADY_SETUP", async () => {
      // Admin already exists
      vi.spyOn(UserModel, "findOne").mockResolvedValue({
        _id: adminId,
        role: "admin",
      });

      const res = await request(app).post("/api/v1/setup").send({
        companyName: "Acme Corp 2",
        adminName: "Bob Admin",
        adminEmail: "bob@company.com",
        adminPassword: "Password123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ALREADY_SETUP");
    });

    it("concurrent setup creates exactly one admin and rejects second with 409", async () => {
      let isFirstCall = true;
      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);

      // Simulate MongoDB unique constraint on Settings singleton _id
      vi.spyOn(SettingsModel, "create").mockImplementation(() => {
        if (isFirstCall) {
          isFirstCall = false;
          return Promise.resolve({
            _id: "company_settings",
            companyName: "Acme Corp",
          });
        }
        const duplicateErr = new Error("E11000 duplicate key error");
        duplicateErr.code = 11000;
        return Promise.reject(duplicateErr);
      });

      vi.spyOn(UserModel, "create").mockResolvedValue({
        _id: adminId,
        role: "admin",
        email: "alice@company.com",
      });
      vi.spyOn(LeaveTypeModel, "updateOne").mockResolvedValue({ acknowledged: true });

      const [res1, res2] = await Promise.all([
        request(app).post("/api/v1/setup").send({
          companyName: "Acme Corp",
          adminName: "Alice Admin",
          adminEmail: "alice@company.com",
          adminPassword: "Password123!",
        }),
        request(app).post("/api/v1/setup").send({
          companyName: "Acme Corp",
          adminName: "Concurrent Admin",
          adminEmail: "concurrent@company.com",
          adminPassword: "Password123!",
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error.code).toBe("ALREADY_SETUP");
    });

    it("on boot, if ADMIN_EMAIL and ADMIN_PASSWORD are set and no admin exists, creates default admin", async () => {
      process.env.ADMIN_EMAIL = "bootadmin@company.com";
      process.env.ADMIN_PASSWORD = "BootPassword123!";

      vi.spyOn(UserModel, "findOne").mockResolvedValue(null);
      vi.spyOn(SettingsModel, "create").mockResolvedValue({
        _id: "company_settings",
        companyName: "HCM Lite",
      });
      vi.spyOn(UserModel, "create").mockResolvedValue({
        _id: adminId,
        email: "bootadmin@company.com",
        role: "admin",
      });
      vi.spyOn(LeaveTypeModel, "updateOne").mockResolvedValue({ acknowledged: true });
      const auditSpy = vi.spyOn(auditService, "audit");

      await initAdminOnBoot();

      expect(UserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "bootadmin@company.com",
          role: "admin",
        }),
      );
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "setup.completed",
          actor: null,
          actorRole: "system",
        }),
      );

      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
    });
  });

  describe("2. Company Settings API (/settings)", () => {
    it("GET /api/v1/settings allows Admin and HR", async () => {
      vi.spyOn(SettingsModel, "findById").mockResolvedValue({
        _id: "company_settings",
        companyName: "Acme Corp",
        timezone: "Asia/Karachi",
        officeStart: "09:00",
        toObject: () => ({
          companyName: "Acme Corp",
          timezone: "Asia/Karachi",
          officeStart: "09:00",
        }),
      });

      const adminRes = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.settings.companyName).toBe("Acme Corp");

      const hrRes = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${hrToken}`);
      expect(hrRes.status).toBe(200);
      expect(hrRes.body.settings.companyName).toBe("Acme Corp");
    });

    it("GET /api/v1/settings rejects Employee with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/settings")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("PUT /api/v1/settings rejects non-admin (Employee and HR) with 403 FORBIDDEN", async () => {
      const empRes = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({ graceMinutes: 20 });
      expect(empRes.status).toBe(403);

      const hrRes = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ graceMinutes: 20 });
      expect(hrRes.status).toBe(403);
    });

    it("PUT /api/v1/settings allows Admin and writes an audit row when settings change", async () => {
      const existingSettings = {
        _id: "company_settings",
        companyName: "Acme Corp",
        graceMinutes: 15,
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return {
            _id: this._id,
            companyName: this.companyName,
            graceMinutes: this.graceMinutes,
          };
        },
      };

      vi.spyOn(SettingsModel, "findById").mockResolvedValue(existingSettings);
      const auditSpy = vi.spyOn(auditService, "audit");

      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ graceMinutes: 20 });

      expect(res.status).toBe(200);
      expect(existingSettings.graceMinutes).toBe(20);
      expect(existingSettings.save).toHaveBeenCalled();

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SETTINGS_UPDATE",
          entity: "settings",
          entityId: "company_settings",
          actorRole: "admin",
          before: expect.objectContaining({ graceMinutes: 15 }),
          after: expect.objectContaining({ graceMinutes: 20 }),
        }),
      );
    });
  });

  describe("3. Password Change & Login Enhancements", () => {
    it("POST /api/v1/auth/change-password clears mustChangePassword and returns a new token", async () => {
      const hashedOldPassword = await bcrypt.hash("OldPassword123!", 10);
      const mockUser = {
        _id: employeeId,
        email: "emp@company.com",
        role: "employee",
        password: hashedOldPassword,
        isActive: true,
        mustChangePassword: true,
        save: vi.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      vi.spyOn(UserModel, "findById").mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "NewSecurePassword456!",
        });

      expect(res.status).toBe(200);
      expect(mockUser.mustChangePassword).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.body.token).toBeDefined();
      expect(res.body.user.mustChangePassword).toBe(false);
    });

    it("POST /api/v1/auth/login returns mustChangePassword in user response", async () => {
      const hashedPassword = await bcrypt.hash("TempPass123!", 10);
      vi.spyOn(UserModel, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: employeeId,
          email: "emp@company.com",
          role: "employee",
          password: hashedPassword,
          isActive: true,
          mustChangePassword: true,
          firstname: "John",
          lastname: "Doe",
        }),
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "emp@company.com",
        password: "TempPass123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.mustChangePassword).toBe(true);
    });

    it("enforces login rate limit (10 per 15 minutes per IP) returning 429", async () => {
      vi.spyOn(UserModel, "findOne").mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      const testIp = "198.51.100.99";

      // 10 failed attempts
      for (let i = 0; i < 10; i++) {
        await request(app).post("/api/v1/auth/login").set("X-Forwarded-For", testIp).send({
          email: "rate_limit@company.com",
          password: "wrong_password",
        });
      }

      // 11th attempt from same IP triggers 429
      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", testIp)
        .send({
          email: "rate_limit@company.com",
          password: "wrong_password",
        });

      expect(res.status).toBe(429);
      expect(res.body.error?.code).toBe("TOO_MANY_REQUESTS");
    });

    it("POST /api/v1/auth/change-password rejects new password < 8 characters with 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/v1/auth/change-password rejects new password equal to current password with 400", async () => {
      const res = await request(app)
        .post("/api/v1/auth/change-password")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          currentPassword: "SamePassword123!",
          newPassword: "SamePassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("4. Settings Zod Validation", () => {
    it("rejects invalid officeStart (not HH:mm) with 400", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ officeStart: "9:00" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid graceMinutes (outside 0-120) with 400", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ graceMinutes: 150 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid halfDayHours (outside 1-12) with 400", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ halfDayHours: 14 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid weekend (empty or invalid days) with 400", async () => {
      const emptyRes = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ weekend: [] });
      expect(emptyRes.status).toBe(400);

      const invalidDayRes = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ weekend: ["Funday"] });
      expect(invalidDayRes.status).toBe(400);
    });

    it("rejects invalid timezone (non-IANA) with 400", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ timezone: "Not/Real_Timezone" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid radiusMeters (outside 10-5000) with 400", async () => {
      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ radiusMeters: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("rejects invalid lat (< -90 or > 90) or lng (< -180 or > 180) with 400", async () => {
      const resLat = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ lat: 95 });
      expect(resLat.status).toBe(400);

      const resLng = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ lng: -190 });
      expect(resLng.status).toBe(400);
    });

    it("accepts valid settings with null lat/lng and valid IANA timezone", async () => {
      const existingSettings = {
        _id: "company_settings",
        companyName: "Acme Corp",
        timezone: "Asia/Karachi",
        officeStart: "09:00",
        graceMinutes: 15,
        halfDayHours: 5,
        weekend: ["Sat", "Sun"],
        officeLat: null,
        officeLng: null,
        radiusMeters: 150,
        latePenaltyEnabled: false,
        save: vi.fn().mockResolvedValue(true),
        toObject: function () {
          return { ...this };
        },
      };

      vi.spyOn(SettingsModel, "findById").mockResolvedValue(existingSettings);

      const res = await request(app)
        .put("/api/v1/settings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          officeStart: "09:30",
          graceMinutes: 10,
          halfDayHours: 4,
          weekend: ["Sun"],
          timezone: "Asia/Karachi",
          radiusMeters: 200,
          lat: 24.8607,
          lng: 67.0011,
          latePenaltyEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.settings.officeStart).toBe("09:30");
      expect(res.body.settings.officeLat).toBe(24.8607);
      expect(res.body.settings.officeLng).toBe(67.0011);
    });
  });

  describe("5. Audit Log Immutability", () => {
    it("rejects updateOne, updateMany, deleteOne, deleteMany, findOneAndUpdate, findOneAndDelete, findOneAndReplace, replaceOne, bulkWrite, and save() on existing docs", async () => {
      expect(() => AuditLogModel.updateOne({ _id: "1" }, { action: "hacked" })).toThrow(
        /append-only/i,
      );
      expect(() => AuditLogModel.updateMany({}, { action: "hacked" })).toThrow(/append-only/i);
      expect(() => AuditLogModel.deleteOne({ _id: "1" })).toThrow(/append-only/i);
      expect(() => AuditLogModel.deleteMany({})).toThrow(/append-only/i);
      expect(() => AuditLogModel.findOneAndUpdate({ _id: "1" }, { action: "hacked" })).toThrow(
        /append-only/i,
      );
      expect(() => AuditLogModel.findOneAndDelete({ _id: "1" })).toThrow(/append-only/i);
      expect(() => AuditLogModel.findOneAndReplace({ _id: "1" }, {})).toThrow(/append-only/i);
      expect(() => AuditLogModel.replaceOne({ _id: "1" }, {})).toThrow(/append-only/i);
      expect(() => AuditLogModel.bulkWrite([])).toThrow(/append-only/i);

      // Testing save() on an existing document (isNew === false)
      const existingAuditDoc = new AuditLogModel({
        action: "TEST",
        entity: "test",
        entityId: "123",
      });
      existingAuditDoc.isNew = false;
      await expect(existingAuditDoc.save()).rejects.toThrow(/append-only/i);
    });
  });
});
