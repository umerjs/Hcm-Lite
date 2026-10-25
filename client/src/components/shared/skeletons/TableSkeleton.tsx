import React from "react";
import { Skeleton } from "../../ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showToolbar?: boolean;
  showPagination?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showToolbar = true,
  showPagination = true,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Optional Toolbar / Search skeleton */}
      {showToolbar && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Skeleton className="h-10 w-full sm:w-72 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {/* Table Header */}
        {showHeader && (
          <div className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-3.5 border-b border-border bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton
                key={`th-${i}`}
                className={`h-4 ${i === 0 ? "w-28" : i === 1 ? "w-36" : "w-20"}`}
              />
            ))}
          </div>
        )}

        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rIndex) => (
            <div
              key={`row-${rIndex}`}
              className="grid grid-flow-col auto-cols-fr gap-4 px-6 py-4 items-center"
            >
              {Array.from({ length: columns }).map((_, cIndex) => {
                // Vary widths for realistic look
                const widthClass =
                  cIndex === 0
                    ? "w-32"
                    : cIndex === 1
                    ? "w-40"
                    : cIndex === 2
                    ? "w-24"
                    : "w-20";
                return (
                  <div key={`cell-${rIndex}-${cIndex}`} className="flex items-center gap-3">
                    {cIndex === 0 && (
                      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    )}
                    <Skeleton className={`h-4 ${widthClass}`} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Optional Pagination skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between px-2 pt-1">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSkeleton;
