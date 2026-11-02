"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Phone, Users, LayoutDashboard, MessageSquare, FileText, Settings, 
  HeartPulse, Activity, LogOut, ChevronDown, Mic, Target, 
  Calendar as CalendarIcon, Megaphone, X, Shield, UserRound, CheckSquare
} from "lucide-react";
import { useCallStore } from "@/store/useCallStore";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shouldShowAgentShell: boolean;
}

export function MobileDrawer({ isOpen, onClose, shouldShowAgentShell }: MobileDrawerProps) {
  const pathname = usePathname();
  const { status, setStatus } = useCallStore();
  const user = useAuthStore((state) => state.user);
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);
  const [isSopOpen, setIsSopOpen] = useState(pathname.startsWith('/sop'));

  const getStatusColor = (s: string) => {
    switch(s) {
      case "AVAILABLE": return "bg-emerald-500 shadow-emerald-500/50";
      case "BUSY": return "bg-amber-500 shadow-amber-500/50";
      case "ON_CALL": return "bg-rose-500 shadow-rose-500/50";
      case "WRAP_UP": return "bg-purple-500 shadow-purple-500/50";
      default: return "bg-slate-500 shadow-slate-500/50";
    }
  };

  // Nav items list for Admin (Default) Shell
  const adminNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Phone, label: "Call Center", href: "/call-center" },
    { icon: MessageSquare, label: "Messaging Hub", href: "/omnichannel" },
    { icon: FileText, label: "Tickets", href: "/tickets" },
    { icon: Activity, label: "AI Call Summary", href: "/ai-summary" },
    { icon: Users, label: "AI Agents", href: "/ai-agents" },
    { icon: Mic, label: "AI Auto Call Record", href: "/ai-records" },
    { icon: Users, label: "Agents", href: "/agents" },
    { icon: Megaphone, label: "Marketing Hub", href: "/marketing" },
    { icon: Settings, label: "Messaging Hub Admin", href: "/automation" },
    { icon: CalendarIcon, label: "Calendar Log", href: "/calendar" },
    { icon: Target, label: "Target Management", href: "/targets" },
    { icon: FileText, label: "Reports", href: "/reports" },
  ];

  // Nav items list for Agent Shell
  const agentNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/agent/dashboard" },
    { icon: Phone, label: "Call Center", href: "/agent/call-center" },
    { icon: MessageSquare, label: "Messaging Hub", href: "/agent/omnichannel" },
    { icon: FileText, label: "Tickets", href: "/agent/tickets" },
    { icon: Activity, label: "AI Call Summary", href: "/agent/ai-summary" },
    { icon: Mic, label: "AI Call Record", href: "/agent/ai-records" },
    { icon: CalendarIcon, label: "Calendar Log", href: "/calendar" },
    { icon: Target, label: "Target Management", href: "/targets" },
    { icon: FileText, label: "Reports", href: "/agent/reports" },
    { icon: UserRound, label: "Customer Data", href: "/agent/customers" },
  ];

  const adminLeads = [
    { label: "Lead Data", href: "/leads/pool" },
    { label: "Conversion Board", href: "/leads/conversion" },
    { label: "Follow Ups", href: "/leads/follow-ups" },
    { label: "Leads Timeline", href: "/customers" },
  ];

  const agentLeads = [
    { label: "Lead Data", href: "/agent/leads/pool" },
    { label: "Conversion Board", href: "/agent/leads/conversion" },
    { label: "Follow Ups", href: "/agent/leads/follow-ups" },
    { label: "Leads Timeline", href: "/agent/customers" },
  ];

  const navItems = shouldShowAgentShell ? agentNavItems : adminNavItems;
  const leadItems = shouldShowAgentShell ? agentLeads : adminLeads;

  const sopItems = [
    { label: "SOP Overview", href: "/sop" },
    { label: "Daily Operations", href: "/sop/daily-operations" },
    { label: "HR SOP", href: "/sop/hr" },
    { label: "CCR SOP", href: "/sop/ccr" },
    { label: "Sales SOP", href: "/sop/sales" },
    { label: "Data Entry SOP", href: "/sop/data-entry" },
    { label: "SOP Builder", href: "/sop/builder" },
    { label: "SOP Documents", href: "/sop/documents" },
    { label: "Reports & Audit", href: "/sop/reports" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    window.location.href = "/login";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-sm"
          />

          {/* Drawer content */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0a0a0a] flex flex-col pt-5 pb-5 shadow-2xl border-r border-[#222]"
          >
            {/* Header / Brand */}
            <div className="px-5 flex items-center justify-between mb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                {shouldShowAgentShell ? (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-md">
                    <Phone className="text-white w-4 h-4" />
                  </div>
                ) : (
                  <Activity className="text-primary w-6 h-6" />
                )}
                <div>
                  <h2 className="font-bold text-base tracking-tight text-white">CRM Tool</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    {shouldShowAgentShell ? "Agent Portal" : "Enterprise Platform"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-[#222] rounded-lg text-slate-400 hover:text-white transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Panel (for admins / agents) */}
            <div className="px-4 mb-4 shrink-0">
              <div className="p-3.5 rounded-2xl bg-[#111] border border-[#222]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Queue Status</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(status || "AVAILABLE")}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {status || "Available"}
                    </span>
                  </div>
                </div>
                <select
                  aria-label="Agent status" value={status || "AVAILABLE"}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-2.5 py-2 text-xs text-white font-medium outline-none focus:border-primary shadow-sm cursor-pointer"
                >
                  <option value="AVAILABLE">🟢 Available</option>
                  <option value="BUSY">🟠 Busy (Break)</option>
                  <option value="ON_CALL">🔴 On Call</option>
                  <option value="WRAP_UP">🟣 Wrap Up</option>
                  <option value="OFFLINE">⚫ Offline</option>
                </select>
              </div>
            </div>

            {/* Scrollable Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1">
                Main Menu
              </p>

              {navItems.map((item, i) => {
                const isActive = pathname.startsWith(item.href) || (pathname === "/" && item.href === "/dashboard");
                
                return (
                  <Link href={item.href} key={i} onClick={onClose}>
                    <div
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                        isActive 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-slate-400 hover:bg-[#111] hover:text-white"
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}

              {/* SOP & Daily Operations Collapsible */}
              <div className="pt-1.5">
                <button 
                  onClick={() => setIsSopOpen(!isSopOpen)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${pathname.startsWith('/sop') ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-400 hover:bg-[#111] hover:text-white'}`}
                >
                  <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-sm font-medium">SOP & Daily Ops</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isSopOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isSopOpen && (
                  <div className="pl-9 pr-3 py-1 space-y-1 bg-[#111]/50 rounded-xl mt-1">
                    {sopItems.map((item, idx) => (
                      <Link href={item.href} key={idx} onClick={onClose}>
                        <div className={`text-xs py-2 transition-colors ${pathname === item.href ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-white"}`}>
                          {item.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Leads Module Collapsible */}
              <div className="pt-1.5">
                <button 
                  onClick={() => setIsLeadsOpen(!isLeadsOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-slate-400 hover:bg-[#111] hover:text-white"
                >
                  <Target className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">Leads</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isLeadsOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isLeadsOpen && (
                  <div className="pl-9 pr-3 py-1 space-y-1 bg-[#111]/50 rounded-xl mt-1">
                    {leadItems.map((item, idx) => (
                      <Link href={item.href} key={idx} onClick={onClose}>
                        <div className={`text-xs py-2 transition-colors ${pathname === item.href ? "text-primary font-bold" : "text-slate-400 hover:text-white"}`}>
                          {item.label}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings (Admin / Base Settings) */}
              <div className="pt-2 border-t border-[#222] mt-2">
                <Link href={shouldShowAgentShell ? "/agent/profile" : "/settings"} onClick={onClose}>
                  <div
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      pathname === "/settings" || pathname === "/agent/profile"
                        ? "bg-primary/10 text-primary font-bold" 
                        : "text-slate-400 hover:bg-[#111] hover:text-white"
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {shouldShowAgentShell ? "My Profile" : "Settings"}
                    </span>
                  </div>
                </Link>
              </div>
            </nav>
            
            {/* User Info Footer & Logout */}
            <div className="px-4 mt-auto pt-4 border-t border-[#222] shrink-0">
              <div className="flex items-center gap-3 p-1 rounded-xl mb-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-bold text-white text-sm shadow">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {user?.name || user?.email?.split("@")[0] || "Agent Smith"}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase truncate">
                    {user?.role || "CRM Portal"}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-2.5 rounded-xl transition-colors font-semibold text-xs min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                Logout Session
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
