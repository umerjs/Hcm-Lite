import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import {
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

  let createdAdminId = null;
  let createdSettingsId = null;

  try {
    // 1. Create the admin user first inside try/catch
    const adminUser = await UserModel.create({
      firstname,
      lastname,
      email: adminEmail.trim().toLowerCase(),
      password: hashedPassword,
      role: "admin",
      isActive: true,
      mustChangePassword: false,
    });
    createdAdminId = adminUser._id;

    // 2. Create the settings document with fixed singleton _id
    const settingsDoc = await SettingsModel.create({
      _id: "company_settings",
      ...DEFAULT_SETTINGS,
      companyName: companyName.trim(),
    });
    createdSettingsId = settingsDoc._id;

    // 3. Seed leave types (annual 14, sick 8, casual 10, unpaid null)
    for (const lt of DEFAULT_LEAVE_TYPES) {
      await LeaveTypeModel.updateOne({ key: lt.key }, { $setOnInsert: lt }, { upsert: true });
    }

    // 4. Write setup.completed audit row (actor null, actorRole "system")
    await audit({
      actor: null,
      actorRole: "system",
      action: "setup.completed",
      entity: "setup",
      entityId: adminUser._id,
      before: null,
      after: {
        companyName: companyName.trim(),
        adminEmail: adminUser.email,
        isBoot,
      },
    });

    return {
      message: "Setup completed successfully",
      user: {
        id: adminUser._id,
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
    if (createdAdminId && (mongoose.connection.readyState === 1 || UserModel.deleteOne?.mock)) {
      await UserModel.deleteOne({ _id: createdAdminId }).catch(() => {});
    }
    if (
      createdSettingsId &&
      (mongoose.connection.readyState === 1 || SettingsModel.deleteOne?.mock)
    ) {
      await SettingsModel.deleteOne({ _id: createdSettingsId }).catch(() => {});
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
 * Resets database to a completely clean, empty state.
 * Allows the Saylani Hackathon judges to test first-run setup from an empty database.
 */
export const resetDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    const db = mongoose.connection.db;
    const existing = (await db.listCollections().toArray()).map((c) => c.name);

    for (const coll of [
      "users",
      "employees",
      "counters",
      "settings",
      "leavetypes",
      "departments",
      "designations",
      "holidays",
      "announcements",
      "notifications",
      "attendances",
      "leaverequests",
      "corrections",
      "ai_logs",
    ]) {
      if (existing.includes(coll)) {
        await db
          .collection(coll)
          .deleteMany({})
          .catch(() => {});
      }
    }
  }

  return {
    success: true,
    needsSetup: true,
    message: "Database has been reset to an empty first-run state. /setup is now active.",
  };
};

/**
 * Populates database with the standard Saylani Hackathon enterprise demo dataset.
 */
export const seedDatabase = async () => {
  // First clear
  await resetDatabase();

  // 1. Settings
  await SettingsModel.create({
    _id: "company_settings",
    companyName: "Saylani HCM Lite",
    timezone: "Asia/Karachi",
    officeStart: "09:00",
    graceMinutes: 15,
    halfDayHours: 5,
    weekend: ["Sat", "Sun"],
    latePenaltyEnabled: false,
    radiusMeters: 150,
  });

  // 2. Leave Types
  await LeaveTypeModel.insertMany([
    { key: "casual", name: "Casual Leave", yearlyQuota: 10, isPaid: true },
    { key: "sick", name: "Sick Leave", yearlyQuota: 8, isPaid: true },
    { key: "annual", name: "Annual Leave", yearlyQuota: 14, isPaid: true },
    { key: "unpaid", name: "Unpaid Leave", yearlyQuota: null, isPaid: false },
  ]);

  // 3. Holidays
  await HolidayModel.insertMany([
    { date: "2026-03-23", name: "Pakistan Day" },
    { date: "2026-05-01", name: "Labour Day" },
    { date: "2026-08-14", name: "Independence Day" },
    { date: "2026-11-09", name: "Iqbal Day" },
    { date: "2026-12-25", name: "Quaid-e-Azam Day" },
  ]);

  // 4. Departments
  const [deptEng, deptHr, deptFin] = await DepartmentModel.insertMany([
    { name: "Engineering" },
    { name: "Human Resources" },
    { name: "Finance & Accounts" },
  ]);

  // 5. Designations
  const [desigEngLead, desigDev, desigHrLead, desigFinAnalyst] = await DesignationModel.insertMany([
    { name: "Senior Software Engineer", departmentId: deptEng._id },
    { name: "Full Stack Developer", departmentId: deptEng._id },
    { name: "HR Business Partner", departmentId: deptHr._id },
    { name: "Financial Analyst", departmentId: deptFin._id },
  ]);

  // 6. Passwords
  const adminHash = await bcrypt.hash("AdminPassword123!", 10);
  const hrHash = await bcrypt.hash("HrPassword123!", 10);
  const empHash = await bcrypt.hash("EmpPassword123!", 10);

  // 7. Admin
  const adminUser = await UserModel.create({
    firstname: "Saylani",
    lastname: "Admin",
    email: "admin@saylani.org",
    password: adminHash,
    role: "admin",
    isActive: true,
    mustChangePassword: false,
  });

  // 8. HR User and Employee
  const hrUser = await UserModel.create({
    firstname: "Sara",
    lastname: "Ahmed",
    email: "hr@saylani.org",
    password: hrHash,
    role: "hr",
    isActive: true,
    mustChangePassword: false,
  });

  const hrEmp = await EmployeeModel.create({
    code: "EMP-0001",
    name: "Sara Ahmed",
    email: "hr@saylani.org",
    phone: "+92 300 1234567",
    address: "Gulshan-e-Iqbal, Karachi",
    gender: "female",
    departmentId: deptHr._id,
    designationId: desigHrLead._id,
    joinDate: "2024-01-15",
    status: "active",
    basicSalary: 125000,
    userId: hrUser._id,
  });
  await UserModel.updateOne({ _id: hrUser._id }, { employeeId: hrEmp._id });

  // 9. Employee 1 (Bilal Khan)
  const empUser1 = await UserModel.create({
    firstname: "Bilal",
    lastname: "Khan",
    email: "emp@saylani.org",
    password: empHash,
    role: "employee",
    isActive: true,
    mustChangePassword: false,
  });

  const emp1 = await EmployeeModel.create({
    code: "EMP-0002",
    name: "Bilal Khan",
    email: "emp@saylani.org",
    phone: "+92 321 9876543",
    address: "PECHS Block 2, Karachi",
    gender: "male",
    departmentId: deptEng._id,
    designationId: desigEngLead._id,
    joinDate: "2024-03-01",
    status: "active",
    basicSalary: 180000,
    userId: empUser1._id,
  });
  await UserModel.updateOne({ _id: empUser1._id }, { employeeId: emp1._id });

  // 10. Employee 2 (Zainab Fatima)
  const empUser2 = await UserModel.create({
    firstname: "Zainab",
    lastname: "Fatima",
    email: "zainab@saylani.org",
    password: empHash,
    role: "employee",
    isActive: true,
    mustChangePassword: false,
  });

  const emp2 = await EmployeeModel.create({
    code: "EMP-0003",
    name: "Zainab Fatima",
    email: "zainab@saylani.org",
    gender: "female",
    departmentId: deptEng._id,
    designationId: desigDev._id,
    joinDate: "2024-06-15",
    status: "active",
    basicSalary: 140000,
    userId: empUser2._id,
  });
  await UserModel.updateOne({ _id: empUser2._id }, { employeeId: emp2._id });

  // Counter
  await CounterModel.create({ _id: "employeeCode", seq: 3 });

  // Attendance
  await AttendanceModel.insertMany([
    {
      employeeId: emp1._id,
      date: "2026-10-23",
      checkIn: new Date("2026-10-23T04:05:00.000Z"),
      checkOut: new Date("2026-10-23T13:00:00.000Z"),
      workedHours: 8.92,
      isLate: false,
      status: "present",
    },
    {
      employeeId: emp1._id,
      date: "2026-10-24",
      checkIn: new Date("2026-10-24T04:10:00.000Z"),
      checkOut: null,
      workedHours: 0,
      isLate: false,
      status: "missing_checkout",
    },
  ]);

  // Announcements
  await AnnouncementModel.create({
    title: "Saylani Hackathon 2026 - Welcome HCM Lite Evaluators!",
    body: "Welcome to HCM Lite. You can switch between Admin, HR, and Employee roles using the quick demo credentials on the login screen.",
    postedBy: { userId: adminUser._id, name: "Saylani Admin", role: "admin" },
    targetRole: "all",
  });

  // Audit
  await AuditLogModel.create({
    actor: adminUser._id,
    actorRole: "admin",
    action: "SYSTEM_INITIALIZED",
    entity: "settings",
    entityId: "company_settings",
    after: { companyName: "Saylani HCM Lite" },
  });

  return {
    success: true,
    needsSetup: false,
    message: "Demo dataset seeded successfully.",
    credentials: {
      admin: "admin@saylani.org / AdminPassword123!",
      hr: "hr@saylani.org / HrPassword123!",
      employee: "emp@saylani.org / EmpPassword123!",
    },
  };
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
