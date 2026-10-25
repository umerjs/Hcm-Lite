import React from "react";
import { Loader2 } from "lucide-react";
import { TableSkeleton } from "./skeletons/TableSkeleton";
import { StatCardSkeleton } from "./skeletons/CardSkeleton";
import { PageSkeleton } from "./skeletons/PageSkeleton";

export interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  type?: "spinner" | "table" | "cards" | "page";
  rows?: number;
  columns?: number;
}

export const Loading: React.FC<LoadingProps> = ({
  text = "Loading...",
  fullScreen = false,
  className = "",
  type = "spinner",
  rows = 5,
  columns = 4,
}) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold text-foreground/80 animate-pulse tracking-wide">
          {text}
        </p>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`py-2 ${className}`}>
        {text && <p className="text-xs text-muted-foreground mb-3 font-medium">{text}</p>}
        <TableSkeleton rows={rows} columns={columns} />
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className={`py-2 ${className}`}>
        {text && <p className="text-xs text-muted-foreground mb-3 font-medium">{text}</p>}
        <StatCardSkeleton count={rows} />
      </div>
    );
  }

  if (type === "page") {
    return (
      <div className={`py-2 ${className}`}>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
      {text && <p className="text-xs text-muted-foreground font-medium">{text}</p>}
    </div>
  );
};

export default Loading;
