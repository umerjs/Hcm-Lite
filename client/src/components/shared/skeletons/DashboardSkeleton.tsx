import React from "react";
import { Skeleton } from "../../ui/skeleton";
import { StatCardSkeleton } from "./CardSkeleton";

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Welcome Banner Skeleton */}
      <div className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-xs relative overflow-hidden">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-72 sm:w-96" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <StatCardSkeleton count={4} />

      {/* Main Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="space-y-3 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`item-${i}`}
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column (1 col wide) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <Skeleton className="h-5 w-36" />
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 text-center">
              <Skeleton className="h-8 w-32 mx-auto" />
              <Skeleton className="h-3 w-40 mx-auto" />
              <Skeleton className="h-11 w-full rounded-xl mt-2" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
