"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Phone, PhoneCall, History, Users, LayoutDashboard, MessageSquare, 
  FileText, Activity, LogOut, Mic, UserRound, Target, ChevronDown, Calendar, CheckSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

export function AgentSidebar() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/agent/dashboard' },
    { icon: CheckSquare, label: 'SOP & Daily Ops', href: '/sop' },
    { icon: Phone, label: 'Call Center', href: '/agent/call-center' },
    { icon: PhoneCall, label: 'Call Logs', href: '/call-logs' },
    { icon: MessageSquare, label: 'Messaging Hub', href: '/agent/omnichannel' },
    { icon: FileText, label: 'Tickets', href: '/agent/tickets' },
    { icon: Activity, label: 'AI Call Summary', href: '/agent/ai-summary' },
    { icon: Mic, label: 'AI Call Record', href: '/agent/ai-records' },
    { icon: Calendar, label: 'Calendar Log', href: '/calendar' },
    { icon: Target, label: 'Target Management', href: '/targets' },
    { icon: FileText, label: 'Reports', href: '/agent/reports' },
    { icon: UserRound, label: 'Customer Data', href: '/agent/customers' },
  ];

  const leadItems = [
    { label: 'Lead Data', href: '/agent/leads/pool' },
    { label: 'Conversion Board', href: '/agent/leads/conversion' },
    { label: 'Follow Ups', href: '/agent/leads/follow-ups' },
    { label: 'Leads Timeline', href: '/agent/customers' },
  ];

  const [user, setUser] = useState<{name: string, department: string} | null>(null);
  const [isLeadsOpen, setIsLeadsOpen] = useState(false);

  React.useEffect(() => {
    const userStr = localStorage.getItem('crm_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }
    }
  }, []);

  return (
    <div className="w-[240px] h-screen border-r border-[#222] bg-[#050505] flex flex-col pt-5 pb-5 shrink-0 relative z-20">
      {/* Brand */}
      <div className="px-6 flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Phone className="text-white w-4 h-4" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white leading-none">CRM Tool</h1>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Agent Portal</p>
        </div>
      </div>

      <div className="px-4 mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-2">Menu</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
        {navItems.map((item, i) => {
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link href={item.href} key={i}>
              <div
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                  ? 'bg-[#111] border border-[#333] shadow-md' 
                  : 'text-slate-400 hover:bg-[#111]/50 hover:text-white border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'bg-[#1a1a1a] text-slate-500 group-hover:bg-[#222] group-hover:text-slate-300'
                }`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Leads Module Collapsible */}
        <div className="pt-2">
          <button 
            onClick={() => setIsLeadsOpen(!isLeadsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${pathname.startsWith('/agent/leads') ? 'bg-[#111] border border-[#333] shadow-md text-white' : 'text-slate-400 hover:bg-[#111]/50 hover:text-white border border-transparent'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${pathname.startsWith('/agent/leads') ? 'bg-primary/10 text-primary' : 'bg-[#1a1a1a] text-slate-500 group-hover:bg-[#222] group-hover:text-slate-300'}`}>
              <Target className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Leads</span>
            <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${isLeadsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isLeadsOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="pl-[3.25rem] pr-3 py-1 space-y-1"
            >
              {leadItems.map((item, idx) => (
                <Link href={item.href} key={idx}>
                  <div className={`text-xs py-2 transition-colors ${pathname === item.href ? 'text-primary font-semibold' : 'text-slate-500 hover:text-slate-300'}`}>
                    {item.label}
                  </div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </nav>
    </div>
  );
}
