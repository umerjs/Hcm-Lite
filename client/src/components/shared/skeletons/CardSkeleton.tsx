import React from "react";
import { Skeleton } from "../../ui/skeleton";

interface StatCardSkeletonProps {
  count?: number;
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`stat-${i}`}
          className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
};

export default StatCardSkeleton;
