import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldAlert, Home, ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface UnauthorizedProps {
  requiredRole?: string;
}

export const Unauthorized: React.FC<UnauthorizedProps> = ({ requiredRole }) => {
  const navigate = useNavigate();
  const { role, logout } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 text-center">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-amber-500/20 bg-card shadow-xl space-y-6">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Permission Required (403)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground pt-2">
            Access Restricted
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your current logged-in role{" "}
            <span className="font-semibold text-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
              {role || "GUEST"}
            </span>{" "}
            does not have the security clearance to access this module.
          </p>
          {requiredRole && (
            <p className="text-xs text-muted-foreground/80 font-medium">
              Required access level:{" "}
              <span className="text-primary font-semibold">{requiredRole}</span>
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground text-left space-y-1.5">
          <p className="font-semibold text-foreground">Need access to this section?</p>
          <p>
            If your responsibilities require viewing this area, please contact your System
            Administrator or Human Resources Manager to update your role permissions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/dashboard"
            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Page
          </button>
        </div>

        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => logout()}
            className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1.5 mx-auto hover:underline cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign in with a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
