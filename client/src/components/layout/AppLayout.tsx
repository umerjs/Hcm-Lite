import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Bot, Sparkles, X } from "lucide-react";
import AiBadge from "../shared/AiBadge";

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar (Desktop and Mobile Drawer) */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenAiDrawer={() => setAiDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Trigger Button (spec line 71, 106) */}
      <button
        type="button"
        onClick={() => setAiDrawerOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
        <span className="text-xs font-bold tracking-wide">Ask Assistant</span>
      </button>

      {/* AI Assistant Drawer Placeholder (Full conversational functionality wired in F7) */}
      {aiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setAiDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">HCM AI Assistant</h3>
                  <AiBadge label="Online" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiDrawerOpen(false)}
                aria-label="Close assistant"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-1">
                HCM Intelligence Ready
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Session assistant is standing by for attendance summaries, leave reasoning, and
                policy inquiries.
              </p>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                Full dialogue wired in Slice F7
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;
