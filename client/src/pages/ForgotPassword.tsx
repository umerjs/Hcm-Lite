import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Input from "../components/PasswordInput";
import Button from "../components/Button";
import { BackendUrl } from "../core";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentPassword) {
      alert("Current password is required");
      return;
    }

    if (!newPassword) {
      alert("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      alert("New password must be different from your current password");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.put(
        `${BackendUrl}/api/v1/password`,
        { currentPassword, newPassword },
        { headers: { authorizedtoken: localStorage.getItem("token") } },
      );

      alert(response.data.message || "Password updated successfully");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      navigate("/login");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Password update failed");
      } else {
        alert("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <svg
                className="h-7 w-7 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 10-4 0v1H9a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2v-8a2 2 0 00-2-2h-2V7z"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Change Password
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Update your password to keep your account secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              placeholder="Enter current password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <Input
              placeholder="Enter new password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <Input
              placeholder="Confirm new password"
              label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs leading-5 text-slate-500">
                Your new password must be at least 6 characters long and
                different from your current password.
              </p>
            </div>

            <Button>{loading ? "Updating..." : "Update Password"}</Button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <Link
              to="/"
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
