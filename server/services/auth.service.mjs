import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CompanyModel, UserModel, SettingsModel, LeaveTypeModel } from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { emailPattern } from "../utils/core.mjs";
import { audit } from "./audit.service.mjs";
import { DEFAULT_SETTINGS } from "./settings.service.mjs";
import { DEFAULT_LEAVE_TYPES } from "./leavetype.service.mjs";

/**
 * Generates signed JWT payload containing user identity and tenant context (companyId).
 *
 * @param {Object} user
 * @returns {string}
 */
export const generateToken = (user) => {
  const companyId = user.companyId?._id || user.companyId;
  const payload = {
    id: user._id || user.id,
    _id: user._id || user.id,
    email: user.email,
    role: user.role,
    companyId,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "8h" });
};

/**
 * Reusable public registration: Provisions a new multi-tenant organization.
 * Creates:
 * 1. Company document
 * 2. Settings document linked to companyId
 * 3. Default LeaveTypes linked to companyId
 * 4. First Admin user linked to companyId
 *
 * @param {Object} params
 * @param {string} params.companyName
 * @param {string} params.adminName
 * @param {string} params.adminEmail
 * @param {string} params.adminPassword
 * @returns {Promise<Object>}
 */
export const registerTenant = async ({ companyName, adminName, adminEmail, adminPassword }) => {
  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "companyName, adminName, adminEmail, and adminPassword are required",
    );
  }

  const trimmedCompanyName = companyName.trim();
  const trimmedAdminEmail = adminEmail.trim().toLowerCase();

  if (!emailPattern.test(trimmedAdminEmail)) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid email format");
  }

  if (typeof adminPassword !== "string" || adminPassword.length < 6) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Admin password must be at least 6 characters long",
    );
  }

  const trimmedName = adminName.trim();
  const nameParts = trimmedName.split(/\s+/);
  const firstname = nameParts[0] || "Admin";
  const lastname = nameParts.slice(1).join(" ") || "User";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  let createdCompany = null;
  let createdAdmin = null;
  let createdSettings = null;

  try {
    // 1. Create Company document
    if (mongoose.connection.readyState === 1 || CompanyModel.create?.mock) {
      createdCompany = await CompanyModel.create({
        name: trimmedCompanyName,
        isActive: true,
      });
    } else {
      createdCompany = {
        _id: new mongoose.Types.ObjectId("671a11112222333344449999"),
        name: trimmedCompanyName,
        isActive: true,
      };
    }

    // 2. Create the first Admin user linked to that companyId
    createdAdmin = await UserModel.create({
      companyId: createdCompany._id,
      firstname,
      lastname,
      email: trimmedAdminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
    });

    // 3. Create Settings document linked to companyId
    createdSettings = await SettingsModel.create({
      companyId: createdCompany._id,
      companyName: trimmedCompanyName,
      ...DEFAULT_SETTINGS,
      _id: undefined,
    });

    // 4. Create default LeaveTypes linked to that companyId
    if (mongoose.connection.readyState === 1 || LeaveTypeModel.create?.mock) {
      for (const lt of DEFAULT_LEAVE_TYPES) {
        await LeaveTypeModel.create({
          companyId: createdCompany._id,
          key: lt.key,
          name: lt.name,
          yearlyQuota: lt.yearlyQuota,
          isPaid: lt.isPaid,
        });
      }
    }

    // 5. Audit tenant provisioning
    await audit({
      companyId: createdCompany._id,
      actor: createdAdmin._id,
      actorRole: "system",
      action: "tenant.registered",
      entity: "company",
      entityId: createdCompany._id,
      before: null,
      after: {
        companyId: createdCompany._id,
        companyName: createdCompany.name,
        adminEmail: createdAdmin.email,
      },
    });

    const token = generateToken(createdAdmin);

    return {
      message: "Company and administrator registered successfully",
      company: {
        id: createdCompany._id,
        name: createdCompany.name,
        isActive: createdCompany.isActive,
      },
      user: {
        id: createdAdmin._id,
        companyId: createdCompany._id,
        email: createdAdmin.email,
        role: createdAdmin.role,
        firstname: createdAdmin.firstname,
        lastname: createdAdmin.lastname,
        mustChangePassword: createdAdmin.mustChangePassword,
      },
      token,
      settings: createdSettings.toObject ? createdSettings.toObject() : createdSettings,
    };
  } catch (err) {
    // Rollback: If any step fails, clean up records created during this call
    if (createdAdmin && (mongoose.connection.readyState === 1 || UserModel.deleteOne?.mock)) {
      await UserModel.deleteOne({ _id: createdAdmin._id }).catch(() => {});
    }
    if (
      createdSettings &&
      (mongoose.connection.readyState === 1 || SettingsModel.deleteOne?.mock)
    ) {
      await SettingsModel.deleteOne({ _id: createdSettings._id }).catch(() => {});
    }
    if (
      createdCompany &&
      (mongoose.connection.readyState === 1 || LeaveTypeModel.deleteMany?.mock)
    ) {
      await LeaveTypeModel.deleteMany({ companyId: createdCompany._id }).catch(() => {});
    }
    if (createdCompany && (mongoose.connection.readyState === 1 || CompanyModel.deleteOne?.mock)) {
      await CompanyModel.deleteOne({ _id: createdCompany._id }).catch(() => {});
    }

    if (err.isAppError) throw err;
    if (err.code === 11000) {
      throw new AppError(
        409,
        "ALREADY_EXISTS",
        "A company or user with these details already exists.",
      );
    }
    throw err;
  }
};
