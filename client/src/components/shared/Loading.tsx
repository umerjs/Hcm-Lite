import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  text = "Loading...",
  fullScreen = false,
  className = "",
}) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="w-9 h-9 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  );
};

export default Loading;
