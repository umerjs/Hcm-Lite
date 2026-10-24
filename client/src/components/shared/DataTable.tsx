import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Loading from "./Loading";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  onPageChange?: (newPage: number) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
  keyExtractor?: (item: T, index: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  total = data.length,
  page = 1,
  limit = 10,
  onPageChange,
  isLoading = false,
  emptyTitle = "No records found",
  emptyMessage = "There are no records matching your current filter.",
  className = "",
  keyExtractor,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div
      className={`w-full rounded-2xl border border-border bg-card overflow-hidden shadow-xs ${className}`}
    >
      {/* Responsive table wrapper: horizontal scroll on narrow mobile screens (375px) */}
      <div className="w-full overflow-x-auto relative">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap ${
                    col.className || ""
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <Loading text="Fetching data..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <EmptyState title={emptyTitle} message={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const rowKey = keyExtractor
                  ? keyExtractor(item, index)
                  : (item as any)?.id || (item as any)?._id || index;
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-muted/30 transition-colors focus-within:bg-muted/30"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-foreground align-middle ${col.className || ""}`}
                      >
                        {col.render ? col.render(item, index) : ((item as any)[col.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {onPageChange && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/60 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span> entries
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="First page"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(1)}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-foreground">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Last page"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(totalPages)}
              className="p-1.5 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
