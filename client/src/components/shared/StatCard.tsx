import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className = "",
}) => {
  return (
    <div
      className={`p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-xs hover:shadow-md transition-shadow ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {trend && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {(subtitle || trend?.label) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {trend?.label ? `${trend.label} ` : ""}
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default StatCard;
