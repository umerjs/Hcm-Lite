import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http, extractErrorMessage } from "../api/http";
import type { RegisterResponse } from "../types/api";
import { Building2, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export const Register: React.FC = () => {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [companyName, setCompanyName] = useState<string>("");
  const [adminName, setAdminName] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

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

      const res = await http.post<RegisterResponse>("/auth/register", payload);
      setSuccessMsg(
        res.data.message || "Organization registered successfully! Redirecting to login...",
      );

      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Organization registered successfully! Please sign in with your administrator credentials.",
            email: adminEmail.trim(),
          },
        });
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, "Company registration failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
              <Sparkles className="w-3 h-3" />
              Multi-Tenant SaaS
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Register Your Organization</h1>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Create a new company account and provision your master administrator workspace.
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
                placeholder="e.g. Acme Corporation"
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
                placeholder="e.g. Jane Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Administrator Work Email
              </label>
              <input
                type="email"
                placeholder="admin@acmecorp.com"
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
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm cursor-pointer"
            >
              {isSubmitting ? "Creating Account..." : "Create Organization Account"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an organization account?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                Sign In
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
