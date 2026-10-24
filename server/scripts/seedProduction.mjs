import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from server/.env.local or server/.env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const mongoUri =
  process.env.MONGODB_URI && process.env.DB_NAME
    ? `${process.env.MONGODB_URI.replace(/\/$/, "")}/${process.env.DB_NAME}`
    : process.env.MONGODB_URI || "mongodb://localhost:27017/hcm_lite";

console.log("Connecting to MongoDB:", mongoUri.replace(/:[^:]*@/, ":****@"));

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

async function seed() {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  // Clear existing collections safely
  console.log("Cleaning up existing collections...");
  const db = mongoose.connection.db;
  const existingCollections = (await db.listCollections().toArray()).map((c) => c.name);

  for (const collName of [
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
    if (existingCollections.includes(collName)) {
      try {
        await db.collection(collName).deleteMany({});
      } catch (err) {
        console.warn(`Could not clear ${collName}:`, err.message);
      }
    }
  }

  // 1. Settings
  console.log("Seeding company settings...");
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
  console.log("Seeding leave types...");
  await LeaveTypeModel.insertMany([
    { key: "casual", name: "Casual Leave", yearlyQuota: 10, isPaid: true },
    { key: "sick", name: "Sick Leave", yearlyQuota: 8, isPaid: true },
    { key: "annual", name: "Annual Leave", yearlyQuota: 14, isPaid: true },
    { key: "unpaid", name: "Unpaid Leave", yearlyQuota: null, isPaid: false },
  ]);

  // 3. Holidays
  console.log("Seeding holidays for 2026...");
  await HolidayModel.insertMany([
    { date: "2026-03-23", name: "Pakistan Day" },
    { date: "2026-05-01", name: "Labour Day" },
    { date: "2026-08-14", name: "Independence Day" },
    { date: "2026-11-09", name: "Iqbal Day" },
    { date: "2026-12-25", name: "Quaid-e-Azam Day" },
  ]);

  // 4. Departments
  console.log("Seeding departments...");
  const [deptEng, deptHr, deptFin, deptOps, deptMkt] = await DepartmentModel.insertMany([
    { name: "Engineering" },
    { name: "Human Resources" },
    { name: "Finance & Accounts" },
    { name: "Operations & Logistics" },
    { name: "Marketing" },
  ]);

  // 5. Designations
  console.log("Seeding designations...");
  const [desigEngLead, desigDev, desigHrLead, desigFinAnalyst] = await DesignationModel.insertMany([
    { name: "Senior Software Engineer", departmentId: deptEng._id },
    { name: "Full Stack Developer", departmentId: deptEng._id },
    { name: "HR Business Partner", departmentId: deptHr._id },
    { name: "Financial Analyst", departmentId: deptFin._id },
  ]);

  // 6. Passwords
  const adminHash = await bcrypt.hash("AdminPassword123!", 10);
  const umerHash = await bcrypt.hash("Umer_0912", 10);
  const hrHash = await bcrypt.hash("HrPassword123!", 10);
  const empHash = await bcrypt.hash("EmpPassword123!", 10);

  // 7. Admin Users
  console.log("Creating admin users...");
  const adminUser = await UserModel.create({
    firstname: "Saylani",
    lastname: "Admin",
    email: "admin@saylani.org",
    password: adminHash,
    role: "admin",
    isActive: true,
    mustChangePassword: false,
  });

  // Secondary admin
  await UserModel.create({
    firstname: "Umer",
    lastname: "Admin",
    email: "umery101@gmail.com",
    password: umerHash,
    role: "admin",
    isActive: true,
    mustChangePassword: false,
  });

  // 8. HR User and Employee
  console.log("Creating HR user and employee record...");
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

  // 9. Employee 1 (Bilal Khan - Senior SWE)
  console.log("Creating standard employees...");
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

  // 10. Employee 2 (Zainab Fatima - Full Stack Dev)
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
    phone: "+92 333 4567890",
    address: "North Nazimabad, Karachi",
    gender: "female",
    departmentId: deptEng._id,
    designationId: desigDev._id,
    joinDate: "2024-06-15",
    status: "active",
    basicSalary: 140000,
    userId: empUser2._id,
  });

  await UserModel.updateOne({ _id: empUser2._id }, { employeeId: emp2._id });

  // 11. Employee 3 (Hamza Tariq - Financial Analyst)
  const empUser3 = await UserModel.create({
    firstname: "Hamza",
    lastname: "Tariq",
    email: "hamza@saylani.org",
    password: empHash,
    role: "employee",
    isActive: true,
    mustChangePassword: false,
  });

  const emp3 = await EmployeeModel.create({
    code: "EMP-0004",
    name: "Hamza Tariq",
    email: "hamza@saylani.org",
    phone: "+92 345 5678901",
    address: "Clifton Block 5, Karachi",
    gender: "male",
    departmentId: deptFin._id,
    designationId: desigFinAnalyst._id,
    joinDate: "2025-01-10",
    status: "active",
    basicSalary: 110000,
    userId: empUser3._id,
  });

  await UserModel.updateOne({ _id: empUser3._id }, { employeeId: emp3._id });

  // 12. Counter
  await CounterModel.create({
    _id: "employeeCode",
    seq: 4,
  });

  // 13. Attendance records (for Bilal Khan & Zainab Fatima)
  console.log("Seeding attendance records...");
  await AttendanceModel.insertMany([
    {
      employeeId: emp1._id,
      date: "2026-10-20",
      checkIn: new Date("2026-10-20T03:55:00.000Z"), // 08:55 PKT
      checkOut: new Date("2026-10-20T13:05:00.000Z"), // 18:05 PKT
      workedHours: 9.17,
      isLate: false,
      status: "present",
    },
    {
      employeeId: emp1._id,
      date: "2026-10-21",
      checkIn: new Date("2026-10-21T04:20:00.000Z"), // 09:20 PKT (Late)
      checkOut: new Date("2026-10-21T13:15:00.000Z"), // 18:15 PKT
      workedHours: 8.92,
      isLate: true,
      status: "present",
    },
    {
      employeeId: emp1._id,
      date: "2026-10-22",
      checkIn: new Date("2026-10-22T03:50:00.000Z"), // 08:50 PKT
      checkOut: new Date("2026-10-22T12:55:00.000Z"), // 17:55 PKT
      workedHours: 9.08,
      isLate: false,
      status: "present",
    },
    {
      employeeId: emp1._id,
      date: "2026-10-23",
      checkIn: new Date("2026-10-23T04:05:00.000Z"), // 09:05 PKT
      checkOut: new Date("2026-10-23T13:00:00.000Z"), // 18:00 PKT
      workedHours: 8.92,
      isLate: false,
      status: "present",
    },
    {
      employeeId: emp1._id,
      date: "2026-10-24",
      checkIn: new Date("2026-10-24T04:10:00.000Z"), // 09:10 PKT
      checkOut: null,
      workedHours: 0,
      isLate: false,
      status: "missing_checkout",
    },
    {
      employeeId: emp2._id,
      date: "2026-10-23",
      checkIn: new Date("2026-10-23T03:58:00.000Z"),
      checkOut: new Date("2026-10-23T13:02:00.000Z"),
      workedHours: 9.07,
      isLate: false,
      status: "present",
    },
  ]);

  // 14. Leave Requests
  console.log("Seeding leave requests...");
  await LeaveRequestModel.insertMany([
    {
      employeeId: emp1._id,
      type: "casual",
      startDate: "2026-10-12",
      endDate: "2026-10-13",
      days: 2,
      reason: "Urgent personal work in hometown",
      status: "approved",
      decidedBy: hrUser._id,
      comment: "Approved. Enjoy your time off.",
    },
    {
      employeeId: emp1._id,
      type: "annual",
      startDate: "2026-11-02",
      endDate: "2026-11-04",
      days: 3,
      reason: "Family vacation to northern areas",
      status: "pending",
    },
    {
      employeeId: emp2._id,
      type: "sick",
      startDate: "2026-09-18",
      endDate: "2026-09-19",
      days: 2,
      reason: "Viral fever and physician recommended rest",
      status: "approved",
      decidedBy: hrUser._id,
      comment: "Medical certificate verified.",
    },
  ]);

  // 15. Announcements
  console.log("Seeding announcements...");
  await AnnouncementModel.insertMany([
    {
      title: "Saylani Hackathon 2026 - Welcome HCM Lite Evaluators!",
      body: "Welcome to HCM Lite, the enterprise human capital management platform developed for the Saylani Hackathon 2026. Use the quick-access demo credentials on the login screen to switch seamlessly between Admin, HR, and Employee roles. All features—including Smart Leave AI, Attendance analytics, Payroll calculation, and Organization management—are fully operational.",
      postedBy: {
        userId: adminUser._id,
        name: "Saylani Admin",
        role: "admin",
      },
      targetRole: "all",
    },
    {
      title: "Office Timing & Attendance Grace Period Policy",
      body: "Standard working hours are 09:00 AM to 06:00 PM (Asia/Karachi). A 15-minute grace period is granted every morning until 09:15 AM. Check-ins after 09:15 AM will automatically be flagged as Late in attendance records.",
      postedBy: {
        userId: hrUser._id,
        name: "Sara Ahmed (HR)",
        role: "hr",
      },
      targetRole: "all",
    },
  ]);

  // 16. Notifications
  console.log("Seeding notifications...");
  await NotificationModel.insertMany([
    {
      userId: empUser1._id,
      type: "leave_decision",
      text: "Your casual leave request for 2026-10-12 to 2026-10-13 has been approved.",
      link: "/leave",
      readAt: new Date(),
    },
    {
      userId: empUser1._id,
      type: "general",
      text: "Welcome to Saylani HCM Lite! Your employee profile EMP-0002 has been activated.",
      link: "/profile",
      readAt: null,
    },
    {
      userId: empUser2._id,
      type: "announcement",
      text: "New announcement posted: Office Timing & Attendance Grace Period Policy.",
      link: "/announcements",
      readAt: null,
    },
  ]);

  // 17. Audit Logs
  console.log("Seeding initial audit logs...");
  await AuditLogModel.create({
    actor: adminUser._id,
    actorRole: "admin",
    action: "SYSTEM_INITIALIZED",
    entity: "settings",
    entityId: "company_settings",
    after: { companyName: "Saylani HCM Lite" },
  });

  await AuditLogModel.create({
    actor: hrUser._id,
    actorRole: "hr",
    action: "EMPLOYEE_CREATED",
    entity: "employees",
    entityId: emp1._id,
    after: { code: "EMP-0002", name: "Bilal Khan" },
  });

  console.log("\n=======================================================");
  console.log("  MOCK DATA SEEDING COMPLETE!");
  console.log("=======================================================");
  console.log("  Admin:    admin@saylani.org  /  AdminPassword123!");
  console.log("  Backup:   umery101@gmail.com /  Umer_0912");
  console.log("  HR:       hr@saylani.org     /  HrPassword123!");
  console.log("  Employee: emp@saylani.org    /  EmpPassword123!");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
