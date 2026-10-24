import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RoleRoute from "./components/guards/RoleRoute";
import AppLayout from "./components/layout/AppLayout";
import Loading from "./components/shared/Loading";
import PlaceholderPage from "./pages/PlaceholderPage";
import Dashboard from "./pages/Dashboard";

// Setup & Auth screens (Slice F1)
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

// Organization & Employee screens (Slice F2)
import Organization from "./pages/Organization";
import Employees from "./pages/Employees";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

const AppRoutes: React.FC = () => {
  const { isSetup, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Initializing HCM Lite..." />;
  }

  return (
    <Routes>
      {/* ── Public / First-Run / Auth routes ────────────────────────────── */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

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
            <Dashboard />
          }
        />

        {/* Organization: Admin only */}
        <Route
          path="organization"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Organization />
            </RoleRoute>
          }
        />

        {/* Employees: HR & Admin */}
        <Route
          path="employees"
          element={
            <RoleRoute allowedRoles={["admin", "hr"]}>
              <Employees />
            </RoleRoute>
          }
        />

        {/* Attendance: All roles (Employee checkin/calendar; HR/Admin attendance board) */}
        <Route
          path="attendance"
          element={
            <PlaceholderPage
              title="Attendance"
              description="Geo-verified check-in, month calendar, daily rosters, and status audits."
              slice="F3"
            />
          }
        />

        {/* Corrections Inbox: HR only */}
        <Route
          path="corrections"
          element={
            <RoleRoute allowedRoles={["hr"]}>
              <PlaceholderPage
                title="Attendance Corrections Inbox"
                description="Review, approve, or reject employee punch adjustment requests."
                slice="F4"
              />
            </RoleRoute>
          }
        />

        {/* Leave: All roles (Employee apply/balances; HR inbox; Admin read-only) */}
        <Route
          path="leave"
          element={
            <PlaceholderPage
              title="Leave Management"
              description="Balances, quota consumption, smart leave application, and approvals."
              slice="F4"
            />
          }
        />

        {/* Payroll: HR (draft/edit) & Admin (review/finalize) */}
        <Route
          path="payroll"
          element={
            <RoleRoute allowedRoles={["admin", "hr"]}>
              <PlaceholderPage
                title="Payroll Processing"
                description="Monthly gross-to-net computation, attendance deductions, tax slabs, and run finalization."
                slice="F5"
              />
            </RoleRoute>
          }
        />

        {/* Payslips: Admin & Employee */}
        <Route
          path="payslips"
          element={
            <RoleRoute allowedRoles={["admin", "employee"]}>
              <PlaceholderPage
                title="Payslips"
                description="Authenticated PDF payslip generation and payment history."
                slice="F5"
              />
            </RoleRoute>
          }
        />

        {/* Announcements: All roles (Admin/HR create; Employee read) */}
        <Route
          path="announcements"
          element={
            <PlaceholderPage
              title="Announcements"
              description="Company-wide notices, policy broadcasts, and HR alerts."
              slice="F8"
            />
          }
        />

        {/* Audit Log: Admin only */}
        <Route
          path="audit"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <PlaceholderPage
                title="Audit Trail"
                description="System-wide security logs, actor tracking, and before/after mutation diffs."
                slice="F8"
              />
            </RoleRoute>
          }
        />

        {/* Notifications: All roles */}
        <Route
          path="notifications"
          element={
            <PlaceholderPage
              title="Notifications"
              description="Real-time alerts, approval requests, and announcement pings."
              slice="F8"
            />
          }
        />

        {/* Profile: All roles */}
        <Route
          path="profile"
          element={
            <PlaceholderPage
              title="My Profile"
              description="Personal credentials, contact details, and assigned workstation."
              slice="F8"
            />
          }
        />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
