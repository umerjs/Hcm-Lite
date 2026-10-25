import React, { lazy } from "react";
import type { UserRole } from "../types/api";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CalendarDays,
  WalletCards,
  Receipt,
  Megaphone,
  ShieldAlert,
  Bell,
  User,
  FileCheck2,
} from "lucide-react";

// Lazy-loaded page components for optimal load performance and code-splitting
export const DashboardPage = lazy(() => import("../pages/Dashboard"));
export const SetupPage = lazy(() => import("../pages/Setup"));
export const LoginPage = lazy(() => import("../pages/Login"));
export const ChangePasswordPage = lazy(() => import("../pages/ChangePassword"));
export const OrganizationPage = lazy(() => import("../pages/Organization"));
export const EmployeesPage = lazy(() => import("../pages/Employees"));
export const AttendancePage = lazy(() => import("../pages/Attendance"));
export const LeavePage = lazy(() => import("../pages/Leave"));
export const PayrollPage = lazy(() => import("../pages/Payroll"));
export const PlaceholderPage = lazy(() => import("../pages/PlaceholderPage"));
export const NotFoundPage = lazy(() => import("../pages/NotFound"));
export const UnauthorizedPage = lazy(() => import("../pages/Unauthorized"));

// Comms pages
export const CommsModule = lazy(() =>
  import("../pages/CommsPages").then((m) => ({
    default: m.AnnouncementsPage,
  }))
);
export const AuditModule = lazy(() =>
  import("../pages/CommsPages").then((m) => ({
    default: m.AuditPage,
  }))
);
export const NotificationsModule = lazy(() =>
  import("../pages/CommsPages").then((m) => ({
    default: m.NotificationsPage,
  }))
);

export interface AppRouteItem {
  path: string;
  title: string;
  allowedRoles?: UserRole[];
  icon?: React.ComponentType<{ className?: string }>;
  isPublic?: boolean;
}

export const APP_ROUTES: AppRouteItem[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/organization",
    title: "Organization Settings",
    allowedRoles: ["admin"],
    icon: Building2,
  },
  {
    path: "/employees",
    title: "Employees Directory",
    allowedRoles: ["admin", "hr"],
    icon: Users,
  },
  {
    path: "/attendance",
    title: "Attendance Board",
    icon: CalendarCheck,
  },
  {
    path: "/corrections",
    title: "Corrections Inbox",
    allowedRoles: ["hr"],
    icon: FileCheck2,
  },
  {
    path: "/leave",
    title: "Leave Management",
    icon: CalendarDays,
  },
  {
    path: "/payroll",
    title: "Payroll",
    allowedRoles: ["admin", "hr"],
    icon: WalletCards,
  },
  {
    path: "/payslips",
    title: "Payslips",
    allowedRoles: ["admin", "employee"],
    icon: Receipt,
  },
  {
    path: "/announcements",
    title: "Announcements",
    icon: Megaphone,
  },
  {
    path: "/audit",
    title: "Audit Log",
    allowedRoles: ["admin"],
    icon: ShieldAlert,
  },
  {
    path: "/notifications",
    title: "Notifications",
    icon: Bell,
  },
  {
    path: "/profile",
    title: "My Profile",
    icon: User,
  },
];

export const isRouteAllowed = (path: string, userRole: UserRole | null): boolean => {
  const route = APP_ROUTES.find((r) => r.path === path);
  if (!route) return true;
  if (!route.allowedRoles) return true;
  if (!userRole) return false;
  return route.allowedRoles.includes(userRole);
};
