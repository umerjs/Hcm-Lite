import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import {
  UserModel,
  LeaveRequestModel,
  CorrectionModel,
  AttendanceModel,
} from "../models/index.mjs";
import * as auditService from "../services/audit.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice B2: Leave & Corrections API", () => {
  const employeeUserId = "671a11112222333344445555";
  const employeeId = "671b11112222333344445555";

  const otherEmployeeUserId = "671d11112222333344445555";
  const otherEmployeeId = "671e11112222333344445555";

  const hrUserId = "671c11112222333344445555";

  let employeeToken;
  let otherEmployeeToken;
  let hrToken;

  beforeEach(() => {
    vi.restoreAllMocks();

    employeeToken = jwt.sign({ _id: employeeUserId, role: "employee" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    otherEmployeeToken = jwt.sign(
      { _id: otherEmployeeUserId, role: "employee" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    hrToken = jwt.sign({ _id: hrUserId, role: "hr" }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Mock UserModel.findById().select() for auth middleware
    vi.spyOn(UserModel, "findById").mockImplementation((id) => {
      const idStr = String(id);
      let role = "employee";
      let empId = employeeId;

      if (idStr === hrUserId) {
        role = "hr";
        empId = null;
      } else if (idStr === otherEmployeeUserId) {
        role = "employee";
        empId = otherEmployeeId;
      }

      return {
        select: vi.fn().mockResolvedValue({
          _id: id,
          email: `${role}@company.com`,
          role,
          employeeId: empId,
          isActive: true,
          mustChangePassword: false,
        }),
      };
    });
  });

  describe("POST /api/v1/leave validations", () => {
    it("returns 422 LEAVE_OVERLAP when dates overlap with an existing approved request", async () => {
      // Existing approved request from 2026-10-26 to 2026-10-27
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "leave_1",
            employeeId,
            type: "casual",
            startDate: "2026-10-26",
            endDate: "2026-10-27",
            days: 2,
            status: "approved",
          },
        ]),
      });

      // New request from 2026-10-27 to 2026-10-28 (overlaps on 2026-10-27)
      const res = await request(app)
        .post("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          type: "casual",
          startDate: "2026-10-27",
          endDate: "2026-10-28",
          reason: "Dentist appointment",
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("LEAVE_OVERLAP");
    });

    it("returns 422 EXCEEDS_QUOTA when requested days exceed quota balance", async () => {
      // Casual quota is 10. Existing approved days = 9.
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: "leave_2",
            employeeId,
            type: "casual",
            startDate: "2026-05-01",
            endDate: "2026-05-15",
            days: 9,
            status: "approved",
          },
        ]),
      });

      // Requesting 2 days (2026-10-26 to 2026-10-27). 9 + 2 = 11 > 10 quota.
      const res = await request(app)
        .post("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          type: "casual",
          startDate: "2026-10-26",
          endDate: "2026-10-27",
          reason: "Family gathering",
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("EXCEEDS_QUOTA");
    });

    it("returns 422 PAST_DATE_LEAVE when start date is in the past", async () => {
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const res = await request(app)
        .post("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          type: "casual",
          startDate: "2026-10-01",
          endDate: "2026-10-02",
          reason: "Past event",
        });

      expect(res.status).toBe(422);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("PAST_DATE_LEAVE");
    });

    it("creates a leave request when valid and returns 201", async () => {
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      vi.spyOn(LeaveRequestModel, "create").mockResolvedValue({
        _id: "leave_new",
        employeeId,
        type: "annual",
        startDate: "2026-10-26",
        endDate: "2026-10-27",
        days: 2,
        reason: "Vacation",
        status: "pending",
      });

      const res = await request(app)
        .post("/api/v1/leave")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          type: "annual",
          startDate: "2026-10-26",
          endDate: "2026-10-27",
          reason: "Vacation",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.days).toBe(2);
    });
  });

  describe("PATCH /api/v1/leave/:id/decision (Role & Authorization)", () => {
    it("an Employee calling the decision route gets 403 FORBIDDEN", async () => {
      const res = await request(app)
        .patch("/api/v1/leave/leave_123/decision")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          status: "approved",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("HR approves a pending leave request successfully", async () => {
      const mockLeave = {
        _id: "leave_123",
        employeeId,
        type: "casual",
        startDate: "2026-10-26",
        endDate: "2026-10-27",
        days: 2,
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(LeaveRequestModel, "findById").mockResolvedValue(mockLeave);

      const res = await request(app)
        .patch("/api/v1/leave/leave_123/decision")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "approved",
          comment: "Approved by HR",
        });

      expect(res.status).toBe(200);
      expect(mockLeave.status).toBe("approved");
      expect(mockLeave.save).toHaveBeenCalled();
    });

    it("HR rejects a leave request without a comment gets 400 COMMENT_REQUIRED", async () => {
      const mockLeave = {
        _id: "leave_123",
        employeeId,
        type: "casual",
        startDate: "2026-10-26",
        endDate: "2026-10-27",
        status: "pending",
        save: vi.fn(),
      };

      vi.spyOn(LeaveRequestModel, "findById").mockResolvedValue(mockLeave);

      const res = await request(app)
        .patch("/api/v1/leave/leave_123/decision")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "rejected",
          comment: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("COMMENT_REQUIRED");
    });
  });

  describe("GET /api/v1/leave/:id (Employee Scoping)", () => {
    it("an Employee cannot read another employee's leave request (gets 403 FORBIDDEN)", async () => {
      // Leave belongs to otherEmployeeId
      vi.spyOn(LeaveRequestModel, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: "leave_other",
            employeeId: { _id: otherEmployeeId, name: "Bob", code: "EMP002" },
            type: "annual",
            startDate: "2026-11-01",
            endDate: "2026-11-05",
            status: "approved",
          }),
        }),
      });

      // Request is made by employeeToken (belongs to employeeId)
      const res = await request(app)
        .get("/api/v1/leave/leave_other")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("an Employee can read their own leave request", async () => {
      vi.spyOn(LeaveRequestModel, "findById").mockReturnValue({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({
            _id: "leave_own",
            employeeId: { _id: employeeId, name: "Alice", code: "EMP001" },
            type: "annual",
            startDate: "2026-11-01",
            endDate: "2026-11-05",
            status: "approved",
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/leave/leave_own")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe("leave_own");
    });
  });

  describe("GET /api/v1/leave/balance", () => {
    it("returns leave balance for authenticated employee", async () => {
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { type: "annual", days: 3, status: "approved" },
          { type: "casual", days: 2, status: "pending" },
        ]),
      });

      const res = await request(app)
        .get("/api/v1/leave/balance")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.balances).toBeInstanceOf(Array);

      const annual = res.body.data.balances.find((b) => b.type === "annual");
      expect(annual.yearlyQuota).toBe(14);
      expect(annual.used).toBe(3);
      expect(annual.remaining).toBe(11);

      const casual = res.body.data.balances.find((b) => b.type === "casual");
      expect(casual.yearlyQuota).toBe(10);
      expect(casual.pending).toBe(2);
      expect(casual.remaining).toBe(10);
    });
  });

  describe("PATCH /api/v1/leave/:id/cancel and balance restoration", () => {
    it("cancelling an approved future leave restores the balance", async () => {
      const futureLeaveId = "671f11112222333344445555";
      const futureLeave = {
        _id: futureLeaveId,
        employeeId,
        type: "annual",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        days: 3,
        status: "approved",
        save: vi.fn().mockImplementation(function () {
          this.status = "cancelled";
          return Promise.resolve(this);
        }),
      };

      vi.spyOn(LeaveRequestModel, "findById").mockResolvedValue(futureLeave);

      // Initial balance check: 3 approved days are used
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ type: "annual", days: 3, status: "approved" }]),
      });

      const balBefore = await request(app)
        .get("/api/v1/leave/balance")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(balBefore.status).toBe(200);
      const annualBefore = balBefore.body.data.balances.find((b) => b.type === "annual");
      expect(annualBefore.used).toBe(3);
      expect(annualBefore.remaining).toBe(11);

      // Cancel the approved future leave
      const cancelRes = await request(app)
        .patch(`/api/v1/leave/${futureLeaveId}/cancel`)
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe("cancelled");
      expect(futureLeave.save).toHaveBeenCalled();

      // Subsequent balance check: cancelled leaves are not in approved/pending, so used = 0
      vi.spyOn(LeaveRequestModel, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      });

      const balAfter = await request(app)
        .get("/api/v1/leave/balance")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(balAfter.status).toBe(200);
      const annualAfter = balAfter.body.data.balances.find((b) => b.type === "annual");
      expect(annualAfter.used).toBe(0);
      expect(annualAfter.remaining).toBe(14); // Restored!
    });
  });

  describe("Audit Helper Integration", () => {
    it("calls audit helper on leave decision, leave cancel, and correction decision", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      // 1. Leave decision audit
      const mockLeave = {
        _id: "leave_audit_1",
        employeeId,
        type: "casual",
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(LeaveRequestModel, "findById").mockResolvedValue(mockLeave);

      await request(app)
        .patch("/api/v1/leave/leave_audit_1/decision")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ status: "approved" });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LEAVE_DECISION",
          entity: "leaverequests",
          entityId: "leave_audit_1",
          after: expect.objectContaining({ status: "approved" }),
        }),
      );

      // 2. Leave cancel audit
      const mockLeaveToCancel = {
        _id: "leave_audit_cancel",
        employeeId,
        type: "casual",
        status: "pending",
        startDate: "2026-11-01",
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(LeaveRequestModel, "findById").mockResolvedValue(mockLeaveToCancel);

      await request(app)
        .patch("/api/v1/leave/leave_audit_cancel/cancel")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "LEAVE_CANCEL",
          entity: "leaverequests",
          entityId: "leave_audit_cancel",
          after: expect.objectContaining({ status: "cancelled" }),
        }),
      );

      // 3. Correction decision audit
      const mockCorrection = {
        _id: "corr_audit_1",
        employeeId,
        date: "2026-10-23",
        requestedCheckIn: new Date("2026-10-23T04:00:00Z"),
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(CorrectionModel, "findById").mockResolvedValue(mockCorrection);
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue({
        checkIn: new Date("2026-10-23T04:00:00Z"),
        save: vi.fn().mockResolvedValue(true),
      });

      await request(app)
        .patch("/api/v1/corrections/corr_audit_1")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({ status: "approved" });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "CORRECTION_DECISION",
          entity: "corrections",
          entityId: "corr_audit_1",
          after: expect.objectContaining({ status: "approved" }),
        }),
      );
    });
  });

  describe("Corrections API (/api/v1/corrections)", () => {
    it("rejects correction for a future date with 422 FUTURE_DATE", async () => {
      const res = await request(app)
        .post("/api/v1/corrections")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          date: "2099-01-01",
          requestedCheckIn: "2099-01-01T04:00:00Z",
          reason: "Future mistake",
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("FUTURE_DATE");
    });

    it("rejects second pending correction for same date with 409 PENDING_CORRECTION_EXISTS", async () => {
      vi.spyOn(CorrectionModel, "findOne").mockResolvedValue({
        _id: "corr_existing",
        employeeId,
        date: "2026-10-23",
        status: "pending",
      });

      const res = await request(app)
        .post("/api/v1/corrections")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          date: "2026-10-23",
          requestedCheckIn: "2026-10-23T04:00:00Z",
          reason: "Forgot to check in",
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("PENDING_CORRECTION_EXISTS");
    });

    it("rejects correction application without requestedCheckIn or requestedCheckOut (422)", async () => {
      const res = await request(app)
        .post("/api/v1/corrections")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          date: "2026-10-23",
          reason: "No timestamps provided",
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("MISSING_TIMESTAMPS");
    });

    it("Employee can apply for an attendance correction", async () => {
      vi.spyOn(CorrectionModel, "findOne").mockResolvedValue(null);
      vi.spyOn(CorrectionModel, "create").mockResolvedValue({
        _id: "corr_1",
        employeeId,
        date: "2026-10-23",
        requestedCheckIn: new Date("2026-10-23T04:00:00Z"),
        requestedCheckOut: new Date("2026-10-23T12:00:00Z"),
        reason: "Forgot to check out before leaving",
        status: "pending",
      });

      const res = await request(app)
        .post("/api/v1/corrections")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          date: "2026-10-23",
          requestedCheckIn: "2026-10-23T04:00:00Z",
          requestedCheckOut: "2026-10-23T12:00:00Z",
          reason: "Forgot to check out before leaving",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.reason).toBe("Forgot to check out before leaving");
    });

    it("HR approves correction and updates the attendance record when one exists", async () => {
      const mockCorrection = {
        _id: "corr_1",
        employeeId,
        date: "2026-10-23",
        requestedCheckIn: new Date("2026-10-23T04:00:00Z"),
        requestedCheckOut: new Date("2026-10-23T12:00:00Z"),
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };

      const mockAttendance = {
        _id: "att_1",
        employeeId,
        date: "2026-10-23",
        checkIn: new Date("2026-10-23T04:00:00Z"),
        checkOut: null,
        workedHours: 0,
        status: "missing_checkout",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(CorrectionModel, "findById").mockResolvedValue(mockCorrection);
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(mockAttendance);

      const res = await request(app)
        .patch("/api/v1/corrections/corr_1")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "approved",
          comment: "Verified with manager",
        });

      expect(res.status).toBe(200);
      expect(mockCorrection.status).toBe("approved");
      expect(mockAttendance.checkOut).toBeDefined();
      expect(mockAttendance.workedHours).toBe(8);
      expect(mockAttendance.status).toBe("present");
      expect(mockAttendance.save).toHaveBeenCalled();
    });

    it("HR approves correction and upserts attendance record when none exists", async () => {
      const mockCorrection = {
        _id: "corr_upsert",
        employeeId,
        date: "2026-10-23",
        requestedCheckIn: new Date("2026-10-23T04:00:00Z"),
        requestedCheckOut: new Date("2026-10-23T12:00:00Z"),
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(CorrectionModel, "findById").mockResolvedValue(mockCorrection);
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);

      const savedRecords = [];
      vi.spyOn(AttendanceModel.prototype, "save").mockImplementation(function () {
        savedRecords.push(this);
        return Promise.resolve(this);
      });

      const res = await request(app)
        .patch("/api/v1/corrections/corr_upsert")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "approved",
          comment: "Approved - upsert record",
        });

      expect(res.status).toBe(200);
      expect(mockCorrection.status).toBe("approved");
      expect(savedRecords.length).toBe(1);
      const created = savedRecords[0];
      expect(String(created.employeeId)).toBe(employeeId);
      expect(created.date).toBe("2026-10-23");
      expect(created.workedHours).toBe(8);
      expect(created.isLate).toBe(false);
      expect(created.isNonWorkingDay).toBe(false);
      expect(created.status).toBe("present");
    });

    it("HR approves correction with only check-in and sets missing_checkout for past date", async () => {
      const mockCorrection = {
        _id: "corr_checkin_only",
        employeeId,
        date: "2026-10-20",
        requestedCheckIn: new Date("2026-10-20T04:00:00Z"),
        requestedCheckOut: null,
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(CorrectionModel, "findById").mockResolvedValue(mockCorrection);
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);

      const savedRecords = [];
      vi.spyOn(AttendanceModel.prototype, "save").mockImplementation(function () {
        savedRecords.push(this);
        return Promise.resolve(this);
      });

      const res = await request(app)
        .patch("/api/v1/corrections/corr_checkin_only")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "approved",
          comment: "Approved checkin only",
        });

      expect(res.status).toBe(200);
      expect(savedRecords.length).toBe(1);
      const created = savedRecords[0];
      expect(created.status).toBe("missing_checkout");
      expect(created.checkOut).toBeNull();
      expect(created.workedHours).toBe(0);
    });

    it("HR cannot approve correction without at least one check-in or check-out (422)", async () => {
      const mockCorrection = {
        _id: "corr_no_times",
        employeeId,
        date: "2026-10-20",
        requestedCheckIn: null,
        requestedCheckOut: null,
        status: "pending",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(CorrectionModel, "findById").mockResolvedValue(mockCorrection);
      vi.spyOn(AttendanceModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/v1/corrections/corr_no_times")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          status: "approved",
          comment: "Approve invalid",
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("INVALID_CORRECTION");
    });
  });
});
