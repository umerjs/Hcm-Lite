import React from "react";

export type AnyStatus =
  | "present"
  | "half_day"
  | "missing_checkout"
  | "absent"
  | "on_leave"
  | "holiday"
  | "weekend"
  | "late"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "draft"
  | "finalized"
  | "locked"
  | "paid"
  | "active"
  | "probation"
  | "resigned"
  | "terminated"
  | string;

interface StatusBadgeProps {
  status: AnyStatus;
  label?: string;
  className?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  present: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    label: "Present",
  },
  half_day: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400 border-amber-500/30",
    label: "Half Day",
  },
  missing_checkout: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-700 dark:text-orange-400 border-orange-500/30",
    label: "Missing Checkout",
  },
  absent: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-400 border-rose-500/30",
    label: "Absent",
  },
  on_leave: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-700 dark:text-blue-400 border-blue-500/30",
    label: "On Leave",
  },
  holiday: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-700 dark:text-purple-400 border-purple-500/30",
    label: "Holiday",
  },
  weekend: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400 border-slate-500/30",
    label: "Weekend",
  },
  late: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
    label: "Late",
  },
  pending: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400 border-amber-500/30",
    label: "Pending",
  },
  approved: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-700 dark:text-rose-400 border-rose-500/30",
    label: "Rejected",
  },
  cancelled: {
    bg: "bg-gray-500/10 dark:bg-gray-500/20",
    text: "text-gray-600 dark:text-gray-400 border-gray-500/30",
    label: "Cancelled",
  },
  draft: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-700 dark:text-sky-400 border-sky-500/30",
    label: "Draft",
  },
  finalized: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    label: "Finalized",
  },
  locked: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-400 border-violet-500/30",
    label: "Locked",
  },
  active: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    label: "Active",
  },
  probation: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400 border-amber-500/30",
    label: "Probation",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = "" }) => {
  const normalizedKey = String(status || "")
    .toLowerCase()
    .replace(/[\s-]/g, "_");
  const style = STATUS_STYLES[normalizedKey] || {
    bg: "bg-muted",
    text: "text-muted-foreground border-border",
    label: String(status || "-"),
  };

  const displayText = label || style.label;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 mr-1.5" />
      {displayText}
    </span>
  );
};

export default StatusBadge;
