import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http, extractErrorMessage } from "../api/http";
import { useAuth } from "../context/AuthContext";
import type { LoginResponse } from "../types/api";

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { login, logout, user, isAuthenticated, isLoading, mustChangePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/login", { replace: true });
      } else if (!mustChangePassword) {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, mustChangePassword, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPassword) {
      setErrorMsg("Current or temporary password is required");
      return;
    }
    if (!newPassword) {
      setErrorMsg("New password is required");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("New password must be at least 8 characters long");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg("New password must be different from current password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await http.post<LoginResponse>("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      // Update auth context with refreshed token and unflagged user
      login(response.data.token, response.data.user);
      setSuccessMsg("Password updated successfully! Taking you to your workspace...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(
        extractErrorMessage(err, "Failed to update password. Please check your credentials."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              🔒
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Update Password</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Your account requires a permanent password before accessing the application.
            </p>
          </div>

          {user?.email && (
            <div className="mb-4 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>Account:</span>
              <span className="font-semibold text-foreground">{user.email}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Current / Temporary Password
              </label>
              <input
                type="password"
                placeholder="Enter temporary password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {isSubmitting ? "Updating Password..." : "Update Password & Continue"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Sign out and return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
