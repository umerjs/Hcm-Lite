import React, { useEffect, useState, useCallback } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface ToastItem {
  id: string;
  type: "error" | "success" | "info" | "warning";
  code?: string;
  title?: string;
  message: string;
  duration?: number;
}

export interface CustomToastInput {
  id?: string;
  type?: "error" | "success" | "info" | "warning";
  code?: string;
  title?: string;
  message: string;
  duration?: number;
}

export type ToastInput = ApiErrorShape | CustomToastInput;

function isApiError(input: ToastInput): input is ApiErrorShape {
  return "error" in input && typeof input.error === "object" && input.error !== null;
}

const TOAST_EVENT = "hcm:toast";

/**
 * Dispatch a toast notification from anywhere (e.g. axios interceptors, mutations).
 * Accepts standard { error: { code, message } } format or custom toast input.
 */
export function dispatchToast(input: ToastInput) {
  if (typeof window === "undefined") return;

  let toastData: Partial<ToastItem>;
  let customId: string | undefined;

  if (isApiError(input)) {
    toastData = {
      type: "error",
      code: input.error.code,
      title: input.error.code ? `Error: ${input.error.code}` : "Error",
      message: input.error.message || "An error occurred",
    };
  } else {
    customId = input.id;
    toastData = {
      type: input.type || "info",
      code: input.code,
      title: input.title,
      message: input.message,
      duration: input.duration,
    };
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: {
        id: customId || Math.random().toString(36).substring(2, 9),
        ...toastData,
      },
    }),
  );
}

export const toast = {
  error: (err: ApiErrorShape | string | { code?: string; message: string }) => {
    if (typeof err === "string") {
      dispatchToast({ type: "error", message: err });
    } else if ("error" in err) {
      dispatchToast(err);
    } else {
      dispatchToast({
        type: "error",
        code: err.code,
        message: err.message,
      });
    }
  },
  success: (message: string, title?: string) => {
    dispatchToast({ type: "success", title, message });
  },
  info: (message: string, title?: string) => {
    dispatchToast({ type: "info", title, message });
  },
  warning: (message: string, title?: string) => {
    dispatchToast({ type: "warning", title, message });
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;

      const newToast: ToastItem = {
        id: customEvent.detail.id || Math.random().toString(36).substring(2, 9),
        type: customEvent.detail.type || "info",
        code: customEvent.detail.code,
        title: customEvent.detail.title,
        message: customEvent.detail.message,
        duration: customEvent.detail.duration || 5000,
      };

      setToasts((prev) => {
        // Prevent duplicate spam of identical message within 2 seconds
        const duplicate = prev.find(
          (t) => t.message === newToast.message && t.code === newToast.code,
        );
        if (duplicate) return prev;
        return [...prev.slice(-4), newToast]; // Keep at most 5 toasts
      });

      // Auto dismiss
      setTimeout(() => {
        removeToast(newToast.id);
      }, newToast.duration || 5000);
    };

    window.addEventListener(TOAST_EVENT, handleEvent);
    return () => window.removeEventListener(TOAST_EVENT, handleEvent);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-[calc(100vw-2rem)] sm:max-w-md w-full pointer-events-none"
    >
      {toasts.map((item) => {
        const isError = item.type === "error";
        const isSuccess = item.type === "success";
        const isWarning = item.type === "warning";

        return (
          <div
            key={item.id}
            role={isError ? "alert" : "status"}
            aria-live="polite"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              isError
                ? "bg-destructive/10 dark:bg-destructive/20 border-destructive/30 text-destructive-foreground"
                : isSuccess
                  ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
                  : isWarning
                    ? "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-950 dark:text-amber-100"
                    : "bg-card border-border text-card-foreground"
            }`}
          >
            {/* Status Icon */}
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-destructive dark:text-rose-400" />}
              {isSuccess && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {isWarning && (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-primary" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {item.code && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-destructive/20 dark:bg-destructive/30 text-destructive dark:text-rose-300 border border-destructive/30">
                    {item.code}
                  </span>
                )}
                {item.title && !item.code && (
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                )}
              </div>
              <p className="text-xs sm:text-sm text-foreground/90 font-medium wrap-break-word leading-relaxed">
                {item.message}
              </p>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => removeToast(item.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
