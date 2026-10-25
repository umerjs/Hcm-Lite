import React from "react";
import { Skeleton } from "../../ui/skeleton";
import { TableSkeleton } from "./TableSkeleton";
import { StatCardSkeleton } from "./CardSkeleton";

interface PageSkeletonProps {
  title?: boolean;
  statCards?: number;
  tableRows?: number;
  tableColumns?: number;
  className?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  title = true,
  statCards = 0,
  tableRows = 6,
  tableColumns = 4,
  className = "",
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Header Skeleton */}
      {title && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-48 sm:w-64" />
            <Skeleton className="h-4 w-72 sm:w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      )}

      {/* Optional Stat Cards */}
      {statCards > 0 && <StatCardSkeleton count={statCards} />}

      {/* Main Table Skeleton */}
      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  );
};

export default PageSkeleton;
