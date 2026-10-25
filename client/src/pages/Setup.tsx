import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, extractErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import type { SetupStatusResponse, SetupResponse } from "../types/api";
import {
  Building2,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  const { checkSetupStatus } = useAuth();

  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [needsSetup, setNeedsSetup] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [companyName, setCompanyName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const fetchStatus = async () => {
    setIsChecking(true);
    try {
      const res = await http.get<SetupStatusResponse>("/setup/status");
      const needed = res.data.needsSetup === true || res.data.isSetup === false;
      setNeedsSetup(needed);
    } catch {
      // Fallback: stay on page to allow setup attempt if needed
      setNeedsSetup(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleResetDatabase = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsResetting(true);
    try {
      await http.post("/setup/reset");
      await checkSetupStatus();
      setNeedsSetup(true);
      setCompanyName("");
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      setConfirmPassword("");
      setSuccessMsg(
        "Database wiped clean! The system is now in an empty first-run state. You can now set up a company from scratch.",
      );
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, "Failed to reset database."));
    } finally {
      setIsResetting(false);
    }
  };

  const handleSeedDatabase = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setIsSeeding(true);
    try {
      await http.post("/setup/seed");
      await checkSetupStatus();
      setSuccessMsg("Saylani demo dataset seeded successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Saylani demo dataset has been loaded with Admin, HR, and Employee test accounts.",
            email: "admin@saylani.org",
          },
        });
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, "Failed to seed demo dataset."));
    } finally {
      setIsSeeding(false);
    }
  };

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
          <p className="text-sm text-muted-foreground font-medium">
            Checking organization setup status...
          </p>
        </div>
      </div>
    );
  }

  // ── State when an organization is already configured ──────────────────────────
  if (!needsSetup) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-3">
              <Building2 className="w-3.5 h-3.5" />
              Single-Company Architecture
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Organization Already Initialized</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Per the Saylani Hackathon PRD, HCM Lite operates as a dedicated internal system for a
              single enterprise. An administrator account is already active.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
            >
              Sign In to Organization Portal
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Hackathon Evaluation Options */}
            <div className="pt-4 mt-4 border-t border-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-3">
                Saylani Hackathon Evaluator Controls
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleResetDatabase}
                  disabled={isResetting || isSeeding}
                  className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                  {isResetting ? "Wiping Database..." : "Reset to Empty DB"}
                </button>

                <button
                  type="button"
                  onClick={handleSeedDatabase}
                  disabled={isResetting || isSeeding}
                  className="p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Database className={`w-3.5 h-3.5 ${isSeeding ? "animate-pulse" : ""}`} />
                  {isSeeding ? "Seeding..." : "Reload Saylani Demo Data"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Use <strong>Reset to Empty DB</strong> to test the pure first-run setup wizard from
                scratch.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── First-Run Setup Form (When DB is completely empty) ────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-2">
              <Sparkles className="w-3 h-3" />
              Empty Database State — First-Run Mode
            </span>
            <h1 className="text-2xl font-bold tracking-tight">HCM Lite First-Run Setup</h1>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Initialize your company profile and register the master administrator account.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Company / Organization Name
              </label>
              <input
                type="text"
                placeholder="e.g. Saylani Welfare International"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isSubmitting || isSeeding}
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
                disabled={isSubmitting || isSeeding}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Administrator Work Email
              </label>
              <input
                type="email"
                placeholder="admin@saylani.org"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={isSubmitting || isSeeding}
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
                  disabled={isSubmitting || isSeeding}
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
                  disabled={isSubmitting || isSeeding}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isSeeding}
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm cursor-pointer"
            >
              {isSubmitting ? "Initializing Organization..." : "Complete Setup & Initialize System"}
            </button>
          </form>

          {/* Shortcut to seed demo data if preferred */}
          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-2">
              Skip manual registration and evaluate with full demo records?
            </p>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={isSubmitting || isSeeding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {isSeeding ? "Seeding Saylani Dataset..." : "Load Pre-Populated Saylani Demo Dataset"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;