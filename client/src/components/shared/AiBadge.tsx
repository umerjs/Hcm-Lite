import React from "react";
import { Sparkles } from "lucide-react";

interface AiBadgeProps {
  label?: string;
  className?: string;
}

export const AiBadge: React.FC<AiBadgeProps> = ({ label = "AI-generated", className = "" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-sky-500/15 dark:from-purple-900/40 dark:via-indigo-900/40 dark:to-sky-900/40 text-indigo-700 dark:text-indigo-200 border border-indigo-500/30 dark:border-indigo-400/40 shadow-xs ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300 animate-pulse" />
      <span>{label}</span>
    </span>
  );
};

export default AiBadge;
