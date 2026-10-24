import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, extractErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import type { SetupStatusResponse, SetupResponse } from "../types/api";

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { checkSetupStatus } = useAuth();

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [companyName, setCompanyName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      setIsChecking(true);
      try {
        const res = await http.get<SetupStatusResponse>("/setup/status");
        if (isMounted) {
          const needed = res.data.needsSetup === true || res.data.isSetup === false;
          setNeedsSetup(needed);
          if (!needed) {
            navigate("/login", { replace: true });
          }
        }
      } catch {
        // Fallback: stay on page to allow setup attempt if needed
        if (isMounted) setNeedsSetup(true);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    };

    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!companyName.trim()) {
      setErrorMsg("Company name is required");
      return;
    }
    if (!adminName.trim()) {
      setErrorMsg("Administrator name is required");
      return;
    }
    if (!adminEmail.trim()) {
      setErrorMsg("Administrator email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    if (!adminPassword) {
      setErrorMsg("Administrator password is required");
      return;
    }
    if (adminPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }
    if (adminPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminPassword,
      };

      const res = await http.post<SetupResponse>("/setup", payload);
      await checkSetupStatus();
      setSuccessMsg(res.data.message || "Setup completed successfully! Redirecting to login...");

      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Setup completed successfully! Please sign in with your administrator credentials.",
            email: adminEmail.trim(),
          },
        });
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, "First-run setup failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (!needsSetup) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-lg text-center">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ✓
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-2">System Already Configured</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The initial administrator and company settings have already been established.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full h-10 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              H
            </div>
            <h1 className="text-2xl font-bold tracking-tight">HCM Lite First-Run Setup</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Initialize your organization profile and provision the master administrator account.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Saylani Welfare International"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Administrator Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Master Admin"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Administrator Email
              </label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Admin Password
                </label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {isSubmitting ? "Initializing Organization..." : "Complete Setup & Initialize System"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Setup;
