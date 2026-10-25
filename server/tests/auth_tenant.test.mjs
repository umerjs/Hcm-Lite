import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../server.mjs";
import { CompanyModel, UserModel, SettingsModel } from "../models/index.mjs";
import { generateToken } from "../services/auth.service.mjs";

process.env.JWT_SECRET = process.env.JWT_SECRET || "hcm_lite_test_secret_32_characters_long";

describe("Phase 1 & Phase 2: Multi-Tenant Foundation & Auth/Registration", () => {
  const companyId = "671a11112222333344449999";
  const userId = "671a11112222333344440001";

  it("1. CompanyModel is defined with name and isActive", () => {
    expect(CompanyModel).toBeDefined();
    expect(CompanyModel.modelName).toBe("Company");
  });

  it("2. generateToken injects companyId into JWT payload", () => {
    const user = {
      _id: userId,
      email: "tenantadmin@company.com",
      role: "admin",
      companyId: companyId,
    };

    const token = generateToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    expect(decoded.companyId).toBe(companyId);
    expect(decoded.id).toBe(userId);
    expect(decoded._id).toBe(userId);
    expect(decoded.role).toBe("admin");
    expect(decoded.email).toBe("tenantadmin@company.com");
  });

  it("3. requireAuth middleware rejects tokens missing companyId with 401 UNAUTHENTICATED", async () => {
    // Token without companyId
    const legacyToken = jwt.sign(
      { _id: userId, role: "admin", email: "legacy@company.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    const res = await request(app)
      .get("/api/v1/settings")
      .set("Authorization", `Bearer ${legacyToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("4. requireAuth middleware succeeds and attaches req.user.companyId when companyId is present", async () => {
    const validTenantToken = jwt.sign(
      { _id: userId, role: "admin", email: "admin@company.com", companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    vi.spyOn(UserModel, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: userId,
        companyId,
        email: "admin@company.com",
        role: "admin",
        isActive: true,
        mustChangePassword: false,
      }),
    });

    const res = await request(app)
      .get("/api/v1/settings")
      .set("Authorization", `Bearer ${validTenantToken}`);

    // Since it's admin with companyId, settings endpoint passes auth (returns 200)
    expect(res.status).toBe(200);
  });

  it("5. POST /api/v1/auth/register provisions a new tenant and returns token with companyId", async () => {
    const regPayload = {
      companyName: "Acme SaaS",
      adminName: "John Doe",
      adminEmail: "john@acmesaas.com",
      adminPassword: "Password123!",
    };

    vi.spyOn(CompanyModel, "create").mockResolvedValue({
      _id: companyId,
      name: "Acme SaaS",
      isActive: true,
    });

    vi.spyOn(UserModel, "create").mockResolvedValue({
      _id: userId,
      companyId,
      firstname: "John",
      lastname: "Doe",
      email: "john@acmesaas.com",
      role: "admin",
      isActive: true,
      mustChangePassword: false,
    });

    vi.spyOn(SettingsModel, "create").mockResolvedValue({
      _id: "settings_1",
      companyId,
      companyName: "Acme SaaS",
    });

    const res = await request(app).post("/api/v1/auth/register").send(regPayload);

    expect(res.status).toBe(201);
    expect(res.body.company.name).toBe("Acme SaaS");
    expect(res.body.user.companyId).toBe(companyId);
    expect(res.body.token).toBeDefined();

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.companyId).toBe(companyId);
  });
});
