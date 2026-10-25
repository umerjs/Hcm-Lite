import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import RoleRoute from "../components/guards/RoleRoute";
import PublicRoute from "../components/guards/PublicRoute";
import AppLayout from "../components/layout/AppLayout";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import { PageSkeleton, DashboardSkeleton } from "../components/shared/skeletons";
import Loading from "../components/shared/Loading";

import {
  DashboardPage,
  RegisterPage,
  LoginPage,
  ChangePasswordPage,
  OrganizationPage,
  EmployeesPage,
  AttendancePage,
  LeavePage,
  PayrollPage,
  PlaceholderPage,
  NotFoundPage,
  UnauthorizedPage,
  CommsModule,
  AuditModule,
  NotificationsModule,
  ProfilePage,
} from "./routesConfig";

export const AppRoutes: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Initializing HCM Lite..." />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* ── Public / Guest / Auth routes ─────────────────────────────────── */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Suspense fallback={<Loading fullScreen text="Loading portal..." />}>
                <LoginPage />
              </Suspense>
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <Suspense fallback={<Loading fullScreen text="Loading registration..." />}>
              <RegisterPage />
            </Suspense>
          }
        />

        <Route path="/setup" element={<Navigate to="/register" replace />} />

        <Route
          path="/change-password"
          element={
            <Suspense fallback={<Loading fullScreen text="Loading password update..." />}>
              <ChangePasswordPage />
            </Suspense>
          }
        />

        <Route
          path="/unauthorized"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <UnauthorizedPage />
            </Suspense>
          }
        />

        {/* ── Authenticated App Shell & Role Guarded Routes ─────────────────── */}
        <Route
          path="/"
          element={
            <RoleRoute>
              <AppLayout />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard: All roles */}
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardPage />
              </Suspense>
            }
          />

          {/* Organization: Admin only */}
          <Route
            path="organization"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <Suspense fallback={<PageSkeleton title statCards={3} tableRows={5} />}>
                  <OrganizationPage />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Employees: HR & Admin */}
          <Route
            path="employees"
            element={
              <RoleRoute allowedRoles={["admin", "hr"]}>
                <Suspense fallback={<PageSkeleton title statCards={4} tableRows={8} />}>
                  <EmployeesPage />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Attendance: All roles */}
          <Route
            path="attendance"
            element={
              <Suspense fallback={<PageSkeleton title statCards={4} tableRows={7} />}>
                <AttendancePage />
              </Suspense>
            }
          />

          {/* Corrections Inbox: HR only */}
          <Route
            path="corrections"
            element={
              <RoleRoute allowedRoles={["hr"]}>
                <Suspense fallback={<PageSkeleton title statCards={3} tableRows={5} />}>
                  <PlaceholderPage
                    title="Attendance Corrections Inbox"
                    description="Review, approve, or reject employee punch adjustment requests."
                    slice="F4"
                  />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Leave: All roles */}
          <Route
            path="leave"
            element={
              <Suspense fallback={<PageSkeleton title statCards={4} tableRows={6} />}>
                <LeavePage />
              </Suspense>
            }
          />

          {/* Payroll: HR (draft/edit) & Admin (review/finalize) */}
          <Route
            path="payroll"
            element={
              <RoleRoute allowedRoles={["admin", "hr"]}>
                <Suspense fallback={<PageSkeleton title statCards={4} tableRows={8} />}>
                  <PayrollPage />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Payslips: Admin & Employee */}
          <Route
            path="payslips"
            element={
              <RoleRoute allowedRoles={["admin", "employee"]}>
                <Suspense fallback={<PageSkeleton title statCards={2} tableRows={6} />}>
                  <PlaceholderPage
                    title="Payslips"
                    description="Authenticated PDF payslip generation and payment history."
                    slice="F5"
                  />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Announcements: All roles */}
          <Route
            path="announcements"
            element={
              <Suspense fallback={<PageSkeleton title tableRows={5} />}>
                <CommsModule />
              </Suspense>
            }
          />

          {/* Audit Log: Admin only */}
          <Route
            path="audit"
            element={
              <RoleRoute allowedRoles={["admin"]}>
                <Suspense fallback={<PageSkeleton title tableRows={10} />}>
                  <AuditModule />
                </Suspense>
              </RoleRoute>
            }
          />

          {/* Notifications: All roles */}
          <Route
            path="notifications"
            element={
              <Suspense fallback={<PageSkeleton title tableRows={6} />}>
                <NotificationsModule />
              </Suspense>
            }
          />

          {/* Profile: All roles */}
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageSkeleton title tableRows={4} />}>
                <ProfilePage />
              </Suspense>
            }
          />
        </Route>

        {/* ── Catch-All 404 Route (Both outside & inside paths) ─────────────── */}
        <Route
          path="*"
          element={
            <Suspense fallback={<Loading fullScreen text="Loading..." />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default AppRoutes;
