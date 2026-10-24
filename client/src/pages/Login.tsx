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

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl shadow-sm">
              H
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In to HCM Lite
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Access your organizational portal and employee workspace
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
                placeholder="name@company.com"
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
              className="w-full h-11 mt-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shadow-sm"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

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
