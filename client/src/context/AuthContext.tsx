import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { http, TOKEN_STORAGE_KEY } from "../api/http";
import type { AuthUser, SetupStatusResponse, AuthMeResponse } from "../types/api";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: AuthUser["role"] | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSetup: boolean | null; // null = pending check, false = needs /setup, true = setup done
  needsSetup: boolean | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
  checkSetupStatus: () => Promise<boolean>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetup, setIsSetup] = useState<boolean | null>(null);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const updateUser = useCallback((updated: Partial<AuthUser>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : null));
  }, []);

  const checkSetupStatus = useCallback(async (): Promise<boolean> => {
    try {
      const res = await http.get<SetupStatusResponse | { isSetup?: boolean; needsSetup?: boolean }>(
        "/setup/status",
      );
      const done = res.data.isSetup === true || (res.data as any).needsSetup === false;
      setIsSetup(done);
      return done;
    } catch {
      // If check fails or setup is unavailable, assume setup might be done or fallback to true to prevent blocking
      setIsSetup(true);
      return true;
    }
  }, []);

  const refetchUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!currentToken) {
      setUser(null);
      return;
    }
    try {
      const res = await http.get<
        AuthMeResponse | { data?: { user?: AuthUser } } | { user?: AuthUser }
      >("/auth/me");
      const fetchedUser =
        (res.data as AuthMeResponse)?.user ||
        (res.data as any)?.data?.user ||
        (res.data as any)?.data ||
        (res.data as any)?.user;

      if (fetchedUser) {
        setUser(fetchedUser);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsLoading(true);
      try {
        // 1. Check setup status first
        const setupDone = await checkSetupStatus();
        if (!setupDone) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // 2. If token exists, verify & fetch user profile
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedToken) {
          try {
            const res = await http.get<AuthMeResponse | { data?: any } | { user?: AuthUser }>(
              "/auth/me",
            );
            const fetchedUser =
              (res.data as AuthMeResponse)?.user ||
              (res.data as any)?.data?.user ||
              (res.data as any)?.data ||
              (res.data as any)?.user;

            if (isMounted && fetchedUser) {
              setUser(fetchedUser);
            }
          } catch {
            if (isMounted) logout();
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    bootstrap();

    // Listen to unauthorized event
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener("hcm:unauthorized", handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener("hcm:unauthorized", handleUnauthorized);
    };
  }, [checkSetupStatus, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        mustChangePassword: Boolean(user?.mustChangePassword),
        isAuthenticated: Boolean(token && user),
        isLoading,
        isSetup,
        needsSetup: isSetup === null ? null : !isSetup,
        login,
        logout,
        updateUser,
        checkSetupStatus,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
