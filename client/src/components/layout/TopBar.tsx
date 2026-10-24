import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { http } from "../../api/http";
import type { NotificationsResponse } from "../../types/api";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  unreadNotificationsCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileSidebar,
  unreadNotificationsCount = 0,
}) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const unreadNotifications = useQuery({ queryKey: ["notifications", "unread"], queryFn: async () => (await http.get<NotificationsResponse>("/notifications?unread=true")).data.data });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  const displayName =
    user?.firstname || user?.lastname
      ? `${user?.firstname || ""} ${user?.lastname || ""}`.trim()
      : user?.email?.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation menu"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            HCM Lite
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
            {role || "Workspace"}
          </span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme switch */}
        <ThemeToggle />

        {/* Notification Bell */}
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {(unreadNotifications.data?.length ?? unreadNotificationsCount) > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
              {(unreadNotifications.data?.length ?? unreadNotificationsCount) > 9 ? "9+" : (unreadNotifications.data?.length ?? unreadNotificationsCount)}
            </span>
          )}
        </Link>

        {/* User menu dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl border border-border bg-card hover:bg-muted/70 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
              {displayName.charAt(0)}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-foreground max-w-[120px] truncate">{displayName}</p>
              <p className="text-muted-foreground capitalize text-[10px]">{role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>

              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-muted text-foreground transition-colors"
              >
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                My Profile
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg hover:bg-destructive/10 text-destructive transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
