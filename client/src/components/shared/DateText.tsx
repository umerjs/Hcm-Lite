import React from "react";

interface DateTextProps {
  date: string | Date | null | undefined;
  format?: "raw" | "medium" | "full" | "time";
  className?: string;
}

export const DateText: React.FC<DateTextProps> = ({ date, format = "raw", className = "" }) => {
  if (!date) return <span className={className}>-</span>;

  // If already standard YYYY-MM-DD string and format is raw, return directly
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && format === "raw") {
    return <span className={`tabular-nums ${className}`}>{date}</span>;
  }

  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return <span className={className}>{String(date)}</span>;
  }

  if (format === "raw") {
    // Return YYYY-MM-DD in Asia/Karachi
    const formatted = d.toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
    return <span className={`tabular-nums ${className}`}>{formatted}</span>;
  }

  if (format === "time") {
    const formattedTime = d.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Karachi",
    });
    return <span className={`tabular-nums ${className}`}>{formattedTime}</span>;
  }

  if (format === "full") {
    const formattedFull = d.toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Karachi",
    });
    return <span className={`tabular-nums ${className}`}>{formattedFull}</span>;
  }

  // medium format: e.g. Oct 24, 2026
  const formattedMedium = d.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

  return <span className={`tabular-nums ${className}`}>{formattedMedium}</span>;
};

export default DateText;
