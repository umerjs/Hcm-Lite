import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { http, extractErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import type { LoginResponse } from "../types/api";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, mustChangePassword, isSetup } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [infoMsg, setInfoMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // If arriving from setup with message / prefilled email
    if (location.state?.message) {
      setInfoMsg(location.state.message);
    }
    if (location.state?.email) {
      setEmail(location.state.email);
    }

    // If already authenticated and password is not forced to change
    if (isAuthenticated) {
      if (mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, mustChangePassword, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email.trim()) {
      setErrorMsg("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    if (!password) {
      setErrorMsg("Password is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await http.post<LoginResponse>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;
      login(token, user);

      // Rule 3: Forced change-password redirect
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
      } else {
        const destination = location.state?.from?.pathname || "/dashboard";
        navigate(destination, { replace: true });
      }
    } catch (error: unknown) {
      setErrorMsg(extractErrorMessage(error, "Invalid email or password"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              H
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In to HCM Lite
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Saylani Hackathon 2026 Enterprise Management Portal
            </p>
          </div>

          {infoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              {infoMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                placeholder="name@saylani.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm cursor-pointer"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* ── Hackathon Demo Quick-Fill Credentials ───────────────────────── */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Hackathon Demo Credentials
              </span>
              <span className="text-[10px] text-muted-foreground/80 font-medium">
                Click any role to 1-click autofill
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillCredentials("admin@saylani.org", "AdminPassword123!")}
                className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 text-left transition-colors cursor-pointer group hover:border-primary/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground group-hover:text-primary">
                    Admin
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    FULL ACCESS
                  </span>
                </div>
                <div className="text-[11px] font-medium text-foreground/90 truncate">
                  admin@saylani.org
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  AdminPassword123!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFillCredentials("hr@saylani.org", "HrPassword123!")}
                className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 text-left transition-colors cursor-pointer group hover:border-blue-500/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground group-hover:text-blue-500">
                    HR Manager
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    HR
                  </span>
                </div>
                <div className="text-[11px] font-medium text-foreground/90 truncate">
                  hr@saylani.org
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  HrPassword123!
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleFillCredentials("emp@saylani.org", "EmpPassword123!")}
                className="p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/70 text-left transition-colors cursor-pointer group hover:border-amber-500/40"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground group-hover:text-amber-500">
                    Employee
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    EMP
                  </span>
                </div>
                <div className="text-[11px] font-medium text-foreground/90 truncate">
                  emp@saylani.org
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  EmpPassword123!
                </div>
              </button>
            </div>
          </div>

          {isSetup === false && (
            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                First time booting up?{" "}
                <Link to="/setup" className="font-semibold text-primary hover:underline">
                  Run First-Time Setup
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
