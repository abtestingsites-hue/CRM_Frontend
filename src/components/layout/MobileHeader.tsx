"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, Bell, X, HeartPulse, Phone } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

interface MobileHeaderProps {
  shouldShowAgentShell: boolean;
  onOpenMenu: () => void;
}

export function MobileHeader({ shouldShowAgentShell, onOpenMenu }: MobileHeaderProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("Agent");
  const [userInitials, setUserInitials] = useState("AG");

  useEffect(() => {
    if (user) {
      const name = user.name || user.email?.split("@")[0] || "Agent";
      setUserName(name);
      setUserInitials(name.substring(0, 2).toUpperCase());
    }
  }, [user]);

  // Dynamic Module Title matching
  const getModuleTitle = (path: string) => {
    if (path.includes("/dashboard")) return "Dashboard";
    if (path.includes("/call-center")) return "Call Center";
    if (path.includes("/omnichannel")) return "Messaging Hub";
    if (path.includes("/tickets")) return "Tickets";
    if (path.includes("/ai-summary")) return "AI Summary";
    if (path.includes("/ai-agents")) return "AI Agents";
    if (path.includes("/ai-records")) return "Call Records";
    if (path.includes("/agents")) return "Agents";
    if (path.includes("/marketing")) return "Marketing";
    if (path.includes("/automation")) return "Automation";
    if (path.includes("/calendar")) return "Calendar Log";
    if (path.includes("/targets")) return "Targets";
    if (path.includes("/reports")) return "Reports";
    if (path.includes("/settings")) return "Settings";
    if (path.includes("/customers")) return "Customers";
    if (path.includes("/leads/pool")) return "Lead Pool";
    if (path.includes("/leads/conversion")) return "Lead Board";
    if (path.includes("/leads/follow-ups")) return "Follow Ups";
    if (path.includes("/leads")) return "Leads";
    return "CRM Tool";
  };

  return (
    <header className="h-14 bg-[#090909]/95 backdrop-blur-md border-b border-[#1e1e1e] px-4 flex items-center justify-between shrink-0 text-white">
      {isSearchOpen ? (
        <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-150">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input aria-label="Search" id="mobile-search-input" type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CRM..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500 py-1"
            autoFocus
          />
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchQuery("");
            }}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          {/* Menu Toggle */}
          <button
            onClick={onOpenMenu}
            className="p-2 -ml-2 text-white hover:bg-[#1a1a1a] rounded-xl transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* CRM Logo & Title */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {shouldShowAgentShell ? (
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-sm">
                <Phone className="text-white w-3 h-3" />
              </div>
            ) : (
              <HeartPulse className="text-primary w-5 h-5 shrink-0" />
            )}
            <div className="text-center">
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
                {getModuleTitle(pathname)}
              </h1>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider leading-none">
                {shouldShowAgentShell ? "Agent Portal" : "CRM Tool"}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1a1a1a] rounded-xl transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-[#090909]"></span>
            </button>

            {/* Profile Avatar */}
            <Link href="/agent/profile" className="ml-1 shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm hover:scale-105 transition-transform">
                {userInitials}
              </div>
            </Link>
          </div>
        </>
      )}
    </header>
  );
}
