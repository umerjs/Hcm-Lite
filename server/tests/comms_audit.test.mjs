import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../server.mjs";
import {
  UserModel,
  AuditLogModel,
  NotificationModel,
  AnnouncementModel,
} from "../models/index.mjs";
import * as auditService from "../services/audit.service.mjs";
import * as notificationService from "../services/notification.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Slice A4: Audit Logs, Communications & Notifications API", () => {
  const adminId = "671a11112222333344440001";
  const hrId = "671a11112222333344440002";
  const employeeUserId = "671a11112222333344440003";

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
      let email = "emp@company.com";

      if (idStr === adminId) {
        role = "admin";
        email = "admin@company.com";
      } else if (idStr === hrId) {
        role = "hr";
        email = "hr@company.com";
      }

      const mockDoc = {
        _id: id,
        email,
        role,
        isActive: true,
        mustChangePassword: false,
        firstname: role.toUpperCase(),
        lastname: "User",
      };

      return {
        select: vi.fn().mockResolvedValue(mockDoc),
        lean: vi.fn().mockResolvedValue(mockDoc),
        then: (resolve) => resolve(mockDoc),
      };
    });
  });

  describe("1. Audit Logs Endpoint (GET /api/v1/audit)", () => {
    it("non-admin users (HR, Employee) calling GET /audit get 403 FORBIDDEN", async () => {
      const hrRes = await request(app)
        .get("/api/v1/audit")
        .set("Authorization", `Bearer ${hrToken}`);

      expect(hrRes.status).toBe(403);
      expect(hrRes.body.error?.code).toBe("FORBIDDEN");

      const empRes = await request(app)
        .get("/api/v1/audit")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(empRes.status).toBe(403);
      expect(empRes.body.error?.code).toBe("FORBIDDEN");
    });

    it("unauthenticated request returns 401 UNAUTHORIZED", async () => {
      const res = await request(app).get("/api/v1/audit");
      expect(res.status).toBe(401);
    });

    it("Admin can retrieve paginated audit logs", async () => {
      vi.spyOn(AuditLogModel, "countDocuments").mockResolvedValue(2);
      vi.spyOn(AuditLogModel, "find").mockReturnValue({
        populate: () => ({
          sort: () => ({
            skip: () => ({
              limit: () => ({
                lean: () =>
                  Promise.resolve([
                    {
                      _id: "audit_1",
                      action: "SETTINGS_UPDATE",
                      entity: "settings",
                      actorRole: "admin",
                      createdAt: new Date().toISOString(),
                    },
                    {
                      _id: "audit_2",
                      action: "EMPLOYEE_CREATED",
                      entity: "employees",
                      actorRole: "hr",
                      createdAt: new Date().toISOString(),
                    },
                  ]),
              }),
            }),
          }),
        }),
      });

      const res = await request(app)
        .get("/api/v1/audit?page=1&pageSize=20")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });

    it("Admin can filter audit logs by action, actorId, and entity", async () => {
      let capturedFilter = null;
      vi.spyOn(AuditLogModel, "countDocuments").mockImplementation((filter) => {
        capturedFilter = filter;
        return Promise.resolve(1);
      });

      vi.spyOn(AuditLogModel, "find").mockImplementation((filter) => {
        capturedFilter = filter;
        return {
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: () =>
                    Promise.resolve([
                      {
                        _id: "audit_filtered",
                        action: "EMPLOYEE_CREATED",
                        entity: "employees",
                        actor: hrId,
                      },
                    ]),
                }),
              }),
            }),
          }),
        };
      });

      const res = await request(app)
        .get(`/api/v1/audit?action=EMPLOYEE_CREATED&actorId=${hrId}&entity=employees`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(capturedFilter).toBeDefined();
      expect(capturedFilter.action).toBe("EMPLOYEE_CREATED");
      expect(capturedFilter.actor).toBe(hrId);
      expect(capturedFilter.entity).toBe("employees");
    });
  });

  describe("2. Announcements API (/api/v1/announcements)", () => {
    it("Admin and HR can post announcements and audit the creation", async () => {
      const auditSpy = vi.spyOn(auditService, "audit");

      vi.spyOn(AnnouncementModel, "create").mockImplementation((doc) => {
        return Promise.resolve({
          _id: "ann_1",
          ...doc,
          createdAt: new Date().toISOString(),
        });
      });

      vi.spyOn(UserModel, "find").mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve([{ _id: employeeUserId }]),
        }),
      });
      vi.spyOn(NotificationModel, "insertMany").mockResolvedValue([]);

      const res = await request(app)
        .post("/api/v1/announcements")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "Town Hall Meeting",
          body: "Join us this Friday at 4 PM for the quarterly town hall.",
          targetRole: "all",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe("Town Hall Meeting");
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ANNOUNCEMENT_CREATED",
          entity: "announcements",
        }),
      );
    });

    it("Employee cannot post an announcement (403 FORBIDDEN)", async () => {
      const res = await request(app)
        .post("/api/v1/announcements")
        .set("Authorization", `Bearer ${employeeToken}`)
        .send({
          title: "Unauthorized Announcement",
          body: "This should fail.",
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("rejects invalid announcement body with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/announcements")
        .set("Authorization", `Bearer ${hrToken}`)
        .send({
          title: "",
          body: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
    });

    it("all authenticated users can read announcements", async () => {
      vi.spyOn(AnnouncementModel, "find").mockReturnValue({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: "ann_1",
                title: "Public Holiday Notice",
                body: "Office will remain closed on Friday.",
                targetRole: "all",
              },
            ]),
        }),
      });

      const res = await request(app)
        .get("/api/v1/announcements")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("Public Holiday Notice");
    });
  });

  describe("3. Notifications Service & Endpoints (/api/v1/notifications)", () => {
    it("createNotification creates a targeted in-app notification", async () => {
      vi.spyOn(NotificationModel, "create").mockResolvedValue({
        _id: "notif_targeted",
        userId: employeeUserId,
        type: "leave_decision",
        text: "Your leave request has been approved",
        link: "/leave",
        readAt: null,
      });

      const notif = await notificationService.createNotification({
        userId: employeeUserId,
        type: "leave_decision",
        text: "Your leave request has been approved",
        link: "/leave",
      });

      expect(notif.userId).toBe(employeeUserId);
      expect(notif.type).toBe("leave_decision");
      expect(notif.text).toBe("Your leave request has been approved");
    });

    it("GET /api/v1/notifications retrieves notifications for the logged-in user", async () => {
      vi.spyOn(NotificationModel, "find").mockReturnValue({
        sort: () => ({
          lean: () =>
            Promise.resolve([
              {
                _id: "notif_1",
                userId: employeeUserId,
                type: "leave_decision",
                text: "Approved",
                readAt: null,
              },
            ]),
        }),
      });

      const res = await request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].text).toBe("Approved");
    });

    it("PATCH /api/v1/notifications/:id/read marks notification as read", async () => {
      const mockNotif = {
        _id: "notif_1",
        userId: employeeUserId,
        text: "Pending task",
        readAt: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(NotificationModel, "findOne").mockResolvedValue(mockNotif);

      const res = await request(app)
        .patch("/api/v1/notifications/notif_1/read")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(mockNotif.readAt).toBeInstanceOf(Date);
      expect(mockNotif.save).toHaveBeenCalled();
    });

    it("PATCH /api/v1/notifications/:id/read returns 404 if notification not found", async () => {
      vi.spyOn(NotificationModel, "findOne").mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/v1/notifications/notif_missing/read")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    });

    it("PATCH /api/v1/notifications/read-all marks all unread notifications as read", async () => {
      const updateManySpy = vi
        .spyOn(NotificationModel, "updateMany")
        .mockResolvedValue({ acknowledged: true, modifiedCount: 3 });

      const res = await request(app)
        .patch("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("All notifications marked as read");
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: employeeUserId, readAt: null }),
        expect.objectContaining({ $set: { readAt: expect.any(Date) } }),
      );
    });
  });
});
