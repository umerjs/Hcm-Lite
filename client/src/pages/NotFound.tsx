import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  FileQuestion,
  Home,
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  Users,
  Wallet,
  Megaphone,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  const quickLinks = [
    { label: "Dashboard", href: "/dashboard", icon: Home },
    { label: "Attendance", href: "/attendance", icon: CalendarCheck },
    { label: "Leave Requests", href: "/leave", icon: CalendarDays },
    ...(role === "admin" || role === "hr"
      ? [
          { label: "Employees", href: "/employees", icon: Users },
          { label: "Payroll", href: "/payroll", icon: Wallet },
        ]
      : []),
    { label: "Announcements", href: "/announcements", icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl text-center space-y-8 py-8">
        {/* Visual 404 Header */}
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
            <FileQuestion className="w-12 h-12 sm:w-14 sm:h-14" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-destructive text-destructive-foreground shadow-sm">
            404
          </span>
        </div>

        {/* Text Content */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            The page you requested could not be located on the HCM Lite server. It may have been
            moved, renamed, or never existed.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/60 border border-border text-xs font-mono text-muted-foreground">
            <span>Requested path:</span>
            <span className="font-semibold text-foreground truncate max-w-xs">
              {location.pathname}
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto flex-1 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto flex-1 h-11 px-5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Page
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="w-full sm:w-auto flex-1 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Go to Sign In
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto flex-1 h-11 px-5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Page
              </button>
            </>
          )}
        </div>

        {/* Helpful Quick Navigation Links */}
        {isAuthenticated && (
          <div className="pt-6 border-t border-border max-w-lg mx-auto text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
              Quick Navigation
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="p-3 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors flex items-center gap-2.5 text-xs font-medium text-foreground group"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;
