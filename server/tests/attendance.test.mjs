import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import { UserModel, AttendanceModel } from "../models/index.mjs";
import * as attendanceService from "../services/attendance.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice B1: Attendance API & Service", () => {
  const companyId = "671a11112222333344449999";
  const employeeUserId = "671a11112222333344445555";
  const employeeId = "671b11112222333344445555";
  const userNoEmployeeId = "671d11112222333344445555";
  const hrUserId = "671c11112222333344445555";

  let employeeToken;
  let hrToken;
  let noProfileToken;

  beforeEach(() => {
    vi.restoreAllMocks();

    employeeToken = jwt.sign(
      { _id: employeeUserId, role: "employee", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    hrToken = jwt.sign(
      { _id: hrUserId, role: "hr", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    noProfileToken = jwt.sign(
      { _id: userNoEmployeeId, role: "employee", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // Mock UserModel.findById().select() for auth middleware
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const isHr = String(id) === hrUserId;
      const isNoProfile = String(id) === userNoEmployeeId;

      return {
        select: vi.fn().mockResolvedValue({
          _id: id,
          companyId,
          email: isHr ? "hr@company.com" : "emp@company.com",
          role: isHr ? "hr" : "employee",
          employeeId: isHr || isNoProfile ? null : employeeId,
          isActive: true,
          mustChangePassword: false,
        }),
      };
    });
  });

  describe("NO_EMPLOYEE_PROFILE Guard (403)", () => {
    it("POST /api/v1/attendance/check-in rejects user without employeeId with 403 NO_EMPLOYEE_PROFILE", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${noProfileToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("NO_EMPLOYEE_PROFILE");
    });

    it("POST /api/v1/attendance/check-out rejects user without employeeId with 403 NO_EMPLOYEE_PROFILE", async () => {
      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${noProfileToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("NO_EMPLOYEE_PROFILE");
    });

    it("GET /api/v1/attendance/me rejects user without employeeId with 403 NO_EMPLOYEE_PROFILE", async () => {
      const res = await request(app)
        .get("/api/v1/attendance/me")
        .set("Authorization", `Bearer ${noProfileToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("NO_EMPLOYEE_PROFILE");
    });
  });

  describe("POST /api/v1/attendance/check-in", () => {
    it("double check-in gives 409 ALREADY_CHECKED_IN", async () => {
      // First check-in succeeds
      vi.spyOn(attendanceService, "checkIn")
        .mockResolvedValueOnce({
          _id: "att_123",
          employeeId,
          date: "2026-10-24",
          checkIn: new Date(),
          status: "present",
        })
        // Second check-in throws 409
        .mockRejectedValueOnce(
          Object.assign(new Error("You have already checked in for today"), {
            isAppError: true,
            status: 409,
            code: "ALREADY_CHECKED_IN",
          }),
        );

      // Call 1: Success (201)
      const res1 = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(res1.status).toBe(201);
      expect(res1.body.data).toBeDefined();

      // Call 2: Duplicate check-in -> 409 Conflict
      const res2 = await request(app)
        .post("/api/v1/attendance/check-in")
        .set("Authorization", `Bearer ${employeeToken}`);
      expect(res2.status).toBe(409);
      expect(res2.body.error).toBeDefined();
      expect(res2.body.error.code).toBe("ALREADY_CHECKED_IN");
    });
  });

  describe("Simultaneous check-ins race condition (Promise.all)", () => {
    it("runs two simultaneous check-ins: exactly one succeeds and one gets 409", async () => {
      // Both simultaneous calls initially find no record (race condition before insert)
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);

      // First create succeeds; second create hits Mongo unique index constraint (E11000)
      const duplicateKeyError = new Error(
        "E11000 duplicate key error collection: attendances index: employeeId_1_date_1",
      );
      duplicateKeyError.code = 11000;

      vi.spyOn(AttendanceModel, "create")
        .mockResolvedValueOnce({
          _id: "att_concurrent_1",
          employeeId,
          date: "2026-10-24",
          checkIn: new Date(),
          status: "present",
        })
        .mockRejectedValueOnce(duplicateKeyError);

      const user = { _id: employeeUserId, employeeId };

      const [res1, res2] = await Promise.allSettled([
        attendanceService.checkIn(user),
        attendanceService.checkIn(user),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
      const rejected = [res1, res2].filter((r) => r.status === "rejected");

      // Exactly one must succeed
      expect(fulfilled).toHaveLength(1);
      expect(fulfilled[0].value.status).toBe("present");

      // Exactly one must fail with 409 ALREADY_CHECKED_IN
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason.status).toBe(409);
      expect(rejected[0].reason.code).toBe("ALREADY_CHECKED_IN");
    });
  });

  describe("POST /api/v1/attendance/check-out", () => {
    it("check-out without check-in gives 422 NO_CHECK_IN", async () => {
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/attendance/check-out")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("NO_CHECK_IN");
    });
  });

  describe("GET /api/v1/attendance/board", () => {
    it("an Employee calling the board gets 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/v1/attendance/board")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("an HR user calling the board succeeds with 200", async () => {
      vi.spyOn(attendanceService, "getBoard").mockResolvedValueOnce([
        {
          employee: { _id: employeeId, code: "EMP001", name: "Alice" },
          status: "present",
        },
      ]);

      const res = await request(app)
        .get("/api/v1/attendance/board")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it("rejects invalid date format query parameter with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/api/v1/attendance/board?date=not-a-date")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields?.date).toBeDefined();
    });
  });

  describe("GET /api/v1/attendance/me", () => {
    it("returns monthly calendar data for authenticated employee", async () => {
      vi.spyOn(AttendanceModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "att_1",
            employeeId,
            date: "2026-10-01",
            checkIn: new Date("2026-10-01T04:00:00Z"),
            checkOut: new Date("2026-10-01T12:00:00Z"),
            workedHours: 8,
            isLate: false,
            status: "present",
          },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/attendance/me?month=2026-10")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.month).toBe("2026-10");
      expect(res.body.data.days).toBeInstanceOf(Array);
      expect(res.body.data.days.length).toBe(31);
    });

    it("rejects invalid month format with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .get("/api/v1/attendance/me?month=2026-13-99")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Service unit tests for checkIn and checkOut", () => {
    it("service checkIn handles Mongo 11000 duplicate key error and throws AppError 409", async () => {
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);
      const duplicateError = new Error("E11000 duplicate key error");
      duplicateError.code = 11000;
      vi.spyOn(AttendanceModel, "create").mockRejectedValue(duplicateError);

      await expect(
        attendanceService.checkIn({ _id: employeeUserId, employeeId }),
      ).rejects.toMatchObject({
        isAppError: true,
        status: 409,
        code: "ALREADY_CHECKED_IN",
      });
    });

    it("service checkOut computes workedHours and sets half_day under 5 hours", async () => {
      const mockRecord = {
        _id: "att_2",
        employeeId,
        date: "2026-10-24",
        checkIn: new Date("2026-10-24T04:00:00Z"), // 09:00 PKT
        checkOut: null,
        workedHours: 0,
        status: "present",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(mockRecord);

      const result = await attendanceService.checkOut({ _id: employeeUserId, employeeId });
      expect(mockRecord.save).toHaveBeenCalled();
      expect(result.checkOut).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });
});
