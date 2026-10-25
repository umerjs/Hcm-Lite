import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loading from "../shared/Loading";
import Unauthorized from "../../pages/Unauthorized";
import type { UserRole } from "../../types/api";

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading fullScreen text="Checking session..." />;
  }

  // 1. If not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Force change password before accessing any internal route
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // 4. Role restriction
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Unauthorized requiredRole={allowedRoles.join(" or ").toUpperCase()} />;
  }

  return <>{children}</>;
};

export default RoleRoute;
