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
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40",
    label: "Present",
  },
  half_day: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40",
    label: "Half Day",
  },

  missing_checkout: {
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-800 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/40",
    label: "Missing Checkout",
  },
  absent: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/40",
    label: "Absent",
  },
  on_leave: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/40",
    label: "On Leave",
  },
  holiday: {
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    text: "text-purple-700 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/40",
    label: "Holiday",
  },
  weekend: {
    bg: "bg-slate-500/10 dark:bg-slate-500/15",
    text: "text-slate-700 dark:text-slate-300 border-slate-500/30 dark:border-slate-500/40",
    label: "Weekend",
  },
  late: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    text: "text-yellow-800 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/40",
    label: "Late",
  },
  pending: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40",
    label: "Pending",
  },
  approved: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40",
    label: "Approved",
  },
  rejected: {
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    text: "text-rose-700 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/40",
    label: "Rejected",
  },
  cancelled: {
    bg: "bg-gray-500/10 dark:bg-gray-500/15",
    text: "text-gray-700 dark:text-gray-300 border-gray-500/30 dark:border-gray-500/40",
    label: "Cancelled",
  },
  draft: {
    bg: "bg-sky-500/10 dark:bg-sky-500/15",
    text: "text-sky-700 dark:text-sky-300 border-sky-500/30 dark:border-sky-500/40",
    label: "Draft",
  },
  finalized: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40",
    label: "Finalized",
  },
  locked: {
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300 border-violet-500/30 dark:border-violet-500/40",
    label: "Locked",
  },
  active: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/40",
    label: "Active",
  },
  probation: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-800 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/40",
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
