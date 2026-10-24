import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Sparkles } from "lucide-react";
import AiChatDrawer from "../shared/AiChatDrawer";

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
      {/* Sidebar (Desktop and Mobile Drawer) */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onOpenAiDrawer={() => setAiDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <TopBar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden animate-in fade-in duration-150">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Trigger Button */}
      <button
        type="button"
        onClick={() => setAiDrawerOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
        <span className="text-xs font-bold tracking-wide">Ask Assistant</span>
      </button>

      {/* Fully wired AI Assistant Drawer (Slice F7) */}
      <AiChatDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  );
};

export default AppLayout;

