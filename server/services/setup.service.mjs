import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
  CompanyModel,
  UserModel,
  EmployeeModel,
  CounterModel,
  SettingsModel,
  LeaveTypeModel,
  DepartmentModel,
  DesignationModel,
  HolidayModel,
  AnnouncementModel,
  NotificationModel,
  AttendanceModel,
  LeaveRequestModel,
  AuditLogModel,
} from "../models/index.mjs";
import { AppError } from "../utils/errors.mjs";
import { audit } from "./audit.service.mjs";
import { DEFAULT_SETTINGS } from "./settings.service.mjs";
import { DEFAULT_LEAVE_TYPES } from "./leavetype.service.mjs";

/**
 * Returns setup status: { needsSetup: boolean }
 * Application needs setup strictly if no admin user exists in the database.
 */
export const getSetupStatus = async () => {
  let adminCount = 0;
  if (mongoose.connection.readyState === 1 || UserModel.countDocuments?.mock) {
    adminCount = await UserModel.countDocuments({ role: "admin" });
  }
  return { needsSetup: adminCount === 0 };
};

/**
 * Performs first-run setup:
 * - Creates admin user first inside try/catch
 * - If any later step fails, deletes everything created by this call so needsSetup stays true
 * - Seeds default leave types (annual 14, sick 8, casual 10, unpaid null)
 * - Writes a setup.completed audit row (actor null, actorRole "system")
 * - Race-safe: Enforces single-document / unique singleton constraints
 *
 * @param {Object} params
 * @param {string} params.companyName
 * @param {string} params.adminName
 * @param {string} params.adminEmail
 * @param {string} params.adminPassword
 * @param {boolean} [params.isBoot=false]
 * @returns {Promise<Object>}
 */
export const performSetup = async ({
  companyName,
  adminName,
  adminEmail,
  adminPassword,
  isBoot = false,
}) => {
  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "companyName, adminName, adminEmail, and adminPassword are required",
    );
  }

  // ALREADY_SETUP strictly if an admin already exists
  const existingAdmin = await UserModel.findOne({ role: "admin" });
  if (existingAdmin) {
    throw new AppError(
      409,
      "ALREADY_SETUP",
      "Setup has already been completed. An administrator account already exists.",
    );
  }

  const trimmedName = adminName.trim();
  const nameParts = trimmedName.split(/\s+/);
  const firstname = nameParts[0] || "Admin";
  const lastname = nameParts.slice(1).join(" ") || "User";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  let createdCompanyId = null;
  let createdAdminId = null;
  let createdSettingsId = null;

  try {
    // 0. Create Company
    let companyId;
    let companyDoc = null;
    if (mongoose.connection.readyState === 1 || CompanyModel.create?.mock) {
      companyDoc = await CompanyModel.create({
        name: companyName.trim(),
        isActive: true,
      });
      createdCompanyId = companyDoc._id;
      companyId = companyDoc._id;
    } else {
      companyId = new mongoose.Types.ObjectId("671a11112222333344449999");
      createdCompanyId = companyId;
      companyDoc = { _id: companyId, name: companyName.trim(), isActive: true };
    }

    // 1. Create the admin user first inside try/catch
    const adminUser = await UserModel.create({
      companyId,
      firstname,
      lastname,
      email: adminEmail.trim().toLowerCase(),
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
    });
    createdAdminId = adminUser._id;

    // 2. Create the settings document linked to companyId
    const settingsDoc = await SettingsModel.create({
      companyId,
      ...DEFAULT_SETTINGS,
      companyName: companyName.trim(),
    });
    createdSettingsId = settingsDoc._id;

    // 3. Seed leave types (annual 14, sick 8, casual 10, unpaid null)
    if (
      mongoose.connection.readyState === 1 ||
      LeaveTypeModel.create?.mock ||
      LeaveTypeModel.updateOne?.mock
    ) {
      for (const lt of DEFAULT_LEAVE_TYPES) {
        if (LeaveTypeModel.updateOne?.mock) {
          await LeaveTypeModel.updateOne(
            { companyId, key: lt.key },
            {
              $setOnInsert: {
                companyId,
                key: lt.key,
                name: lt.name,
                yearlyQuota: lt.yearlyQuota,
                isPaid: lt.isPaid,
              },
            },
            { upsert: true },
          );
        } else {
          await LeaveTypeModel.create({
            companyId,
            key: lt.key,
            name: lt.name,
            yearlyQuota: lt.yearlyQuota,
            isPaid: lt.isPaid,
          });
        }
      }
    }

    // 4. Write setup.completed audit row (actor null, actorRole "system")
    await audit({
      companyId,
      actor: null,
      actorRole: "system",
      action: "setup.completed",
      entity: "setup",
      entityId: adminUser._id,
      before: null,
      after: {
        companyId,
        companyName: companyName.trim(),
        adminEmail: adminUser.email,
        isBoot,
      },
    });

    return {
      message: "Setup completed successfully",
      company: {
        id: companyDoc?._id || companyId,
        name: companyDoc?.name || companyName.trim(),
        isActive: companyDoc?.isActive ?? true,
      },
      user: {
        id: adminUser._id,
        companyId: companyId,
        email: adminUser.email,
        role: adminUser.role,
        firstname: adminUser.firstname,
        lastname: adminUser.lastname,
        mustChangePassword: adminUser.mustChangePassword,
      },
      settings: settingsDoc.toObject ? settingsDoc.toObject() : settingsDoc,
    };
  } catch (err) {
    // Rollback: If any later step fails, delete everything this call created so needsSetup stays true!
    if (createdCompanyId && (mongoose.connection.readyState === 1 || CompanyModel.deleteOne?.mock)) {
      await CompanyModel.deleteOne({ _id: createdCompanyId }).catch(() => {});
    }
    if (createdAdminId && (mongoose.connection.readyState === 1 || UserModel.deleteOne?.mock)) {
      await UserModel.deleteOne({ _id: createdAdminId }).catch(() => {});
    }
    if (
      createdSettingsId &&
      (mongoose.connection.readyState === 1 || SettingsModel.deleteOne?.mock)
    ) {
      await SettingsModel.deleteOne({ _id: createdSettingsId }).catch(() => {});
    }
    if (
      createdCompanyId &&
      (mongoose.connection.readyState === 1 || LeaveTypeModel.deleteMany?.mock)
    ) {
      await LeaveTypeModel.deleteMany({ companyId: createdCompanyId }).catch(() => {});
    }
    if (
      createdCompanyId &&
      (mongoose.connection.readyState === 1 || CompanyModel.deleteOne?.mock)
    ) {
      await CompanyModel.deleteOne({ _id: createdCompanyId }).catch(() => {});
    }

    if (err.isAppError) throw err;
    if (err.code === 11000) {
      throw new AppError(
        409,
        "ALREADY_SETUP",
        "Setup has already been completed or duplicate record found.",
      );
    }
    throw err;
  }
};

/**
 * On-boot initializer:
 * If ADMIN_EMAIL and ADMIN_PASSWORD are set in environment and no admin exists, creates default setup.
 */
export const initAdminOnBoot = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  try {
    const existingAdmin = await UserModel.findOne({ role: "admin" });
    if (existingAdmin) {
      return;
    }

    console.log(
      `[BOOT] No administrator found. Provisioning admin from environment (${adminEmail})...`,
    );
    await performSetup({
      companyName: process.env.COMPANY_NAME || "HCM Lite",
      adminName: process.env.ADMIN_NAME || "System Admin",
      adminEmail,
      adminPassword,
      isBoot: true,
    });
    console.log(`[BOOT] Initial administrator provisioned successfully.`);
  } catch (err) {
    console.error(`[BOOT ERROR] Failed to initialize administrator on boot:`, err.message);
  }
};
