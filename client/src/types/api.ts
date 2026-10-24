/**
 * HCM Lite — API Contract & Shared Data Types
 * Derived authoritatively from docs/PRD.md Section 7, 8, 9 and docs/RULES.md.
 */

// ── Common API Response Wrappers ──────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Setup Module ─────────────────────────────────────────────────────────────

export interface SetupStatusResponse {
  needsSetup: boolean;
  isSetup?: boolean;
}

export interface SetupRequest {
  companyName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  email?: string;
  password?: string;
}

export interface SetupResponse {
  message: string;
  user: AuthUser;
  settings: CompanySettings;
}

// ── Auth Module ──────────────────────────────────────────────────────────────

export type UserRole = "admin" | "hr" | "employee";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  employeeId?: string | null;
  mustChangePassword?: boolean;
  firstname?: string;
  lastname?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthMeResponse {
  user: AuthUser;
}

// ── Users Module (Admin) ─────────────────────────────────────────────────────

export interface CreateHrRequest {
  firstname: string;
  lastname: string;
  email: string;
}

export interface CreateHrResponse {
  user: AuthUser;
  tempPassword: string;
}

export interface ResetPasswordResponse {
  tempPassword: string;
  message: string;
}

// ── Company Settings ─────────────────────────────────────────────────────────

export interface CompanySettings {
  companyName: string;
  timezone: string; // e.g. "Asia/Karachi"
  officeStart: string; // e.g. "09:00"
  graceMinutes: number; // e.g. 15
  halfDayHours: number; // e.g. 5
  weekend: string[]; // e.g. ["Sat", "Sun"]
  officeLat?: number;
  officeLng?: number;
  radiusMeters?: number;
  latePenaltyEnabled: boolean; // default false
}

export type UpdateSettingsRequest = Partial<CompanySettings>;

// ── Organization Structure ───────────────────────────────────────────────────

export interface Department {
  _id: string;
  name: string;
  createdAt?: string;
}

export interface Designation {
  _id: string;
  name: string;
  departmentId?: string;
  createdAt?: string;
}

export type LeaveTypeKey = "annual" | "sick" | "casual" | "unpaid";

export interface LeaveType {
  _id: string;
  key: LeaveTypeKey;
  name: string;
  yearlyQuota: number | null; // null = unlimited (e.g. unpaid)
  isPaid: boolean;
}

export interface Holiday {
  _id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

// ── Employees Module ─────────────────────────────────────────────────────────

export type EmployeeGender = "male" | "female" | "other";
export type EmployeeStatus = "active" | "probation" | "exited";

export interface Employee {
  _id: string;
  code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gender: EmployeeGender;
  departmentId: string | Department;
  designationId: string | Designation;
  joinDate: string; // YYYY-MM-DD
  exitDate?: string | null;
  status: EmployeeStatus;
  basicSalary: number;
  userId?: string;
  createdAt?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  gender: EmployeeGender;
  departmentId: string;
  designationId: string;
  joinDate: string;
  basicSalary: number;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  tempPassword: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  gender?: EmployeeGender;
  departmentId?: string;
  designationId?: string;
  status?: EmployeeStatus;
  basicSalary?: number;
  exitDate?: string | null;
}

export interface UpdateMyProfileRequest {
  phone?: string;
  address?: string;
}

// ── Attendance Module ────────────────────────────────────────────────────────

export type AttendanceStatus =
  | "present"
  | "half_day"
  | "missing_checkout"
  | "absent"
  | "on_leave"
  | "weekend"
  | "holiday"
  | "none";

export interface AttendanceRecord {
  _id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // UTC ISO string
  checkOut?: string | null; // UTC ISO string
  workedHours: number;
  isLate: boolean;
  status: "present" | "half_day";
  isNonWorkingDay: boolean;
}

export interface AttendanceSummaryItem {
  date: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  workedHours?: number;
  isLate?: boolean;
  isNonWorkingDay?: boolean;
}

export interface AttendanceBoardItem {
  employee: {
    _id: string;
    code: string;
    name: string;
    department?: string;
  };
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  isLate?: boolean;
}

// ── Corrections Module ───────────────────────────────────────────────────────

export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface AttendanceCorrection {
  _id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: CorrectionStatus;
  decidedBy?: string;
  comment?: string;
  createdAt: string;
}

export interface CreateCorrectionRequest {
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface DecideCorrectionRequest {
  status: "approved" | "rejected";
  comment?: string;
}

// ── Leave Module ─────────────────────────────────────────────────────────────

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  _id: string;
  employeeId: string | Employee;
  type: LeaveTypeKey;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  reason: string;
  status: LeaveRequestStatus;
  decidedBy?: string;
  comment?: string;
  createdAt: string;
}

export interface ApplyLeaveRequest {
  type: LeaveTypeKey;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface LeaveBalanceItem {
  type: LeaveTypeKey;
  name: string;
  yearlyQuota: number | null;
  used: number; // approved days this year
  pending: number; // pending days
  remaining: number | null; // yearlyQuota - used (null for unlimited)
}

export interface DecideLeaveRequest {
  status: "approved" | "rejected";
  comment?: string;
}

// ── Payroll Module ───────────────────────────────────────────────────────────

export type PayrollRunStatus = "draft" | "finalized";

export interface SetSalaryRequest {
  basic: number;
}

export interface PayrollItem {
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  employee?: {
    _id?: string;
    code?: string;
    name?: string;
    email?: string;
    department?: string;
    designation?: string;
  };
  month?: string;
  departmentName?: string;
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDays: number;
  employedDays: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  deductions: number;
  tax: number;
  monthlyTax?: number;
  net: number;
  penalty?: number;
  lateCount?: number;
}

export interface PayrollRun {
  _id: string;
  month: string; // YYYY-MM
  status: PayrollRunStatus;
  createdBy: string;
  finalizedBy?: string;
  finalizedAt?: string;
  totals: {
    gross: number;
    deductions: number;
    tax: number;
    net: number;
    employeeCount: number;
  };
  items?: PayrollItem[];
}

export interface Payslip {
  _id: string;
  runId: string;
  employeeId: string;
  month: string;
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  absentDays: number;
  unpaidDays: number;
  halfDays: number;
  deductions: number;
  tax: number;
  net: number;
  createdAt: string;
}

// ── Analytics Module ─────────────────────────────────────────────────────────

export interface HrDashboardResponse {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
  pendingLeaves: number;
  pendingCorrections: number;
}

export interface EmployeeDashboardResponse {
  currentMonthAttendance: {
    present: number;
    absent: number;
    late: number;
  };
  leaveBalances: {
    annual: number;
    sick: number;
    casual: number;
  };
  pendingRequests: number;
}

export interface AdminAnalytics {
  headcount: number;
  attritionRate: number;
  totalPayrollCost: number;
  averageSalary: number;
  departmentBreakdown: {
    department: string;
    headcount: number;
    payrollCost: number;
  }[];
  recentAuditLogs: AuditLogItem[];
}

export interface HrAnalytics {
  headcount: number;
  attendanceRate: number;
  latePercentage: number;
  absenteeismRate: number;
  leaveUtilization: {
    type: string;
    used: number;
  }[];
  topLateComers: {
    employeeId: string;
    name: string;
    department?: string;
    lateCount: number;
  }[];
  attendanceTrend: {
    date: string;
    present: number;
    absent: number;
    late: number;
  }[];
}

export interface EmployeeAnalytics {
  hoursWorkedThisMonth: number;
  lateCount: number;
  remainingLeaveDays: number;
  lastPayslip?: Payslip;
  recentAnnouncements: Announcement[];
}

// ── AI Assistant Module ──────────────────────────────────────────────────────

export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiChatRequest {
  message: string;
  history?: AiChatMessage[];
}

export interface AiChatResponse {
  response: string;
  message?: string;
  answer?: string;
  aiGenerated?: boolean;
  toolsUsed?: string[];
  toolCalls?: string[];
  tokens?: number;
  logId?: string;
}

export interface AiSummaryRequest {
  filters: {
    from: string;
    to: string;
    departmentId?: string;
  };
  kpis: Record<string, unknown>;
}

export interface AiSummaryResponse {
  bullets: string[];
  aiGenerated: true;
}

export interface AiSmartLeaveRequest {
  text: string;
}

export interface AiSmartLeaveResponse {
  fallback?: boolean;
  type?: LeaveTypeKey;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

// ── Announcements & Notifications ────────────────────────────────────────────

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  postedBy: {
    name: string;
    role: string;
  };
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: "leave_decision" | "payslip" | "correction_decision" | "announcement" | "general";
  text: string;
  link?: string;
  readAt?: string | null;
  createdAt: string;
}

// ── Audit Log Module ─────────────────────────────────────────────────────────

export interface AuditLogItem {
  _id: string;
  actorId?: string;
  actor?: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  createdAt: string;
}

export interface GetAuditLogsQuery {
  action?: string;
  actorId?: string;
  entity?: string;
  page?: number;
  pageSize?: number;
}

export interface GetAuditLogsResponse {
  data: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ── Additional Endpoints & Query Schemas ─────────────────────────────────────

export interface GetEmployeesQuery {
  q?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  page?: number;
  pageSize?: number;
}

export interface GetEmployeesResponse {
  data: Employee[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface UpdateSalaryRequest {
  basicSalary: number;
}

export interface CreateHolidayRequest {
  date: string;
  name: string;
}

export interface UpdateHolidayRequest {
  date?: string;
  name?: string;
}

export interface CreateAnnouncementRequest {
  title: string;
  body: string;
  targetRole?: "all" | "employee" | "hr" | "admin";
}

export interface AnnouncementsResponse {
  data: Announcement[];
}

export interface NotificationsResponse {
  data: Notification[];
}
