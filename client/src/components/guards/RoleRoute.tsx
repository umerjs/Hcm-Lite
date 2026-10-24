import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../shared/Loading";
import ErrorState from "../shared/ErrorState";
import type { UserRole } from "../../types/api";

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role, mustChangePassword, isSetup } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading fullScreen text="Checking session..." />;
  }

  // 1. If system needs first-run setup
  if (isSetup === false && location.pathname !== "/setup") {
    return <Navigate to="/setup" replace />;
  }

  // 2. If not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Force change password before accessing any internal route
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // 4. Role restriction
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorState
          title="Access Forbidden (403)"
          message={`Your current role (${role.toUpperCase()}) does not have permission to view this section.`}
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleRoute;
