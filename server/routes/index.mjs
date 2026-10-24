import authRoutes from "./auth/index.mjs";
import profileRoutes from "./profile/index.mjs";
import passwordRoutes from "./password/index.mjs";
import attendanceRoutes from "./attendance/index.mjs";
import leaveRoutes from "./leave/index.mjs";
import correctionRoutes from "./correction/index.mjs";
import setupRoutes from "./setup/index.mjs";
import settingsRoutes from "./settings/index.mjs";
import organizationRoutes from "./organization/index.mjs";
import holidayRoutes from "./holiday/index.mjs";
import leavetypeRoutes from "./leavetype/index.mjs";
import userRoutes from "./users/index.mjs";
import employeeRoutes from "./employee/index.mjs";
import auditRoutes from "./audit/index.mjs";
import commsRoutes from "./comms/index.mjs";
import payrollRoutes from "./payroll/index.mjs";
import analyticsRoutes from "./analytics/index.mjs";
import aiRoutes from "./ai/index.mjs";
import { multerMiddleware } from "../libs/multer.mjs";

export {
  authRoutes,
  profileRoutes,
  passwordRoutes,
  attendanceRoutes,
  leaveRoutes,
  correctionRoutes,
  setupRoutes,
  settingsRoutes,
  organizationRoutes,
  holidayRoutes,
  leavetypeRoutes,
  userRoutes,
  employeeRoutes,
  auditRoutes,
  commsRoutes,
  payrollRoutes,
  analyticsRoutes,
  aiRoutes,
  multerMiddleware,
};
