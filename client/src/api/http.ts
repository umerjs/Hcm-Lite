import axios, { AxiosError } from "axios";
import type { ApiError } from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
    : "/api/v1");

export const TOKEN_STORAGE_KEY = "hcm_token";

/**
 * http — the single axios instance the entire client uses.
 * - Automatically attaches Authorization: Bearer <hcm_token>
 * - On 401 response, clears token and dispatches custom auth event
 * - Normalizes backend error responses to standard ApiError format
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach token ──────────────────────────────────────────
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Normalized error helper ───────────────────────────────────────────────────
export interface NormalizedError {
  code: string;
  message: string;
  fields?: Record<string, string>;
  status?: number;
}

export function extractErrorMessage(
  err: unknown,
  defaultMsg = "An unexpected error occurred",
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.error?.message) return data.error.message;
    if (typeof (data as any)?.message === "string") return (data as any).message;
  }
  if (err instanceof Error) return err.message;
  return defaultMsg;
}

// ── Response interceptor: handle 401 and normalize error ─────────────────────
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError | { message?: string }>) => {
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Dispatch global event so AuthContext reacts without page reload loop
      window.dispatchEvent(new CustomEvent("hcm:unauthorized"));
    }

    const payload = error.response?.data;
    const normalized: NormalizedError = {
      code: (payload as ApiError)?.error?.code || (status ? `HTTP_${status}` : "NETWORK_ERROR"),
      message:
        (payload as ApiError)?.error?.message ||
        (payload as { message?: string })?.message ||
        error.message ||
        "Request failed",
      fields: (payload as ApiError)?.error?.fields,
      status,
    };

    // Attach normalized error to the AxiosError object for easy consumption
    (error as any).normalizedError = normalized;

    return Promise.reject(error);
  },
);
