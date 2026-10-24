import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CalendarDays,
  WalletCards,
  Receipt,
  Megaphone,
  ShieldAlert,
  Bell,
  User,
  FileCheck2,
  X,
  Bot,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiDrawer?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenAiDrawer }) => {
  const { role } = useAuth();

  const getNavItems = (currentRole: UserRole | null): NavItem[] => {
    switch (currentRole) {
      case "admin":
        return [
          { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { label: "Organization", path: "/organization", icon: Building2 },
          { label: "Employees", path: "/employees", icon: Users },
          { label: "Attendance Board", path: "/attendance", icon: CalendarCheck },
          { label: "Leave", path: "/leave", icon: CalendarDays },
          { label: "Payroll", path: "/payroll", icon: WalletCards },
          { label: "Payslips", path: "/payslips", icon: Receipt },
          { label: "Announcements", path: "/announcements", icon: Megaphone },
          { label: "Audit Log", path: "/audit", icon: ShieldAlert },
          { label: "Notifications", path: "/notifications", icon: Bell },
          { label: "Profile", path: "/profile", icon: User },
        ];
      case "hr":
        return [
          { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { label: "Employees", path: "/employees", icon: Users },
          { label: "Attendance Board", path: "/attendance", icon: CalendarCheck },
          { label: "Corrections Inbox", path: "/corrections", icon: FileCheck2 },
          { label: "Leave Inbox", path: "/leave", icon: CalendarDays },
          { label: "Payroll", path: "/payroll", icon: WalletCards },
          { label: "Announcements", path: "/announcements", icon: Megaphone },
          { label: "Notifications", path: "/notifications", icon: Bell },
          { label: "Profile", path: "/profile", icon: User },
        ];
      case "employee":
      default:
        return [
          { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
          { label: "My Attendance", path: "/attendance", icon: CalendarCheck },
          { label: "My Leave", path: "/leave", icon: CalendarDays },
          { label: "My Payslips", path: "/payslips", icon: Receipt },
          { label: "Announcements", path: "/announcements", icon: Megaphone },
          { label: "Notifications", path: "/notifications", icon: Bell },
          { label: "My Profile", path: "/profile", icon: User },
        ];
    }
  };

  const navItems = getNavItems(role);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Sidebar Header / Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-sm shadow-sm">
            H
          </div>
          <div>
            <span className="font-bold tracking-tight text-base text-foreground">HCM Lite</span>
            <span className="block text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Human Capital
            </span>
          </div>
        </div>

        {/* Close button on mobile drawer */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* AI Assistant Quick Drawer Launcher */}
      {onOpenAiDrawer && (
        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={onOpenAiDrawer}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-sky-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 hover:bg-indigo-500/20 transition-all shadow-xs"
          >
            <Bot className="w-4 h-4 text-indigo-500 animate-pulse" />
            <span>AI Assistant</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (under 768px) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
