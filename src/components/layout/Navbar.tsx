"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Clock, AlertTriangle, Activity, CheckCircle2, Users } from 'lucide-react';
import { useQueueStore } from '@/store/queueStore';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { GlobalUnitSwitcher } from './GlobalUnitSwitcher';

export function Navbar() {
  const { callsInQueue, emergencyAlerts } = useQueueStore();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('Agent Smith');
  const [userRole, setUserRole] = useState('Tier 2 Support');
  const [userInitials, setUserInitials] = useState('AS');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeAgentsCount, setActiveAgentsCount] = useState<number | null>(null);
  const [agentBreakdown, setAgentBreakdown] = useState<{ available: number; busy: number; wrapUp: number }>({ available: 0, busy: 0, wrapUp: 0 });

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('crm_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const emailPrefix = user.email ? user.email.split('@')[0] : 'Raghav';
        const displayName = user.name || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));
        setUserName(displayName);
        setUserInitials(displayName.substring(0, 2).toUpperCase());
        if (user.role) {
          const formattedRole = user.role.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
          setUserRole(formattedRole);
          if (user.role === 'SUPER_ADMIN') {
            setIsSuperAdmin(true);
          }
        }
      }
    } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let isMounted = true;

    const fetchActiveCount = async () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('paramantra_access_token') || localStorage.getItem('crm_token');
        if (!token) return;
        const res = await apiFetch('/api/v1/super-admin/active-agents');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && typeof data.count === 'number') {
            setActiveAgentsCount(data.count);
            if (data.breakdown) {
              setAgentBreakdown(data.breakdown);
            }
          }
        }
      } catch (err) {
        // Silently preserve existing state
      }
    };

    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mockNotifications: any[] = [];

  return (
    <header className="h-14 bg-[#000] border-b border-[#222] flex items-center justify-between px-6 z-50 sticky top-0">
      {/* Global Search */}
      <div className="max-w-md w-full relative group">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" />
        <input aria-label="Global search" 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers, cases, or tickets (Press /)" 
          className="w-full bg-[#111] border border-[#222] focus:border-primary focus:bg-[#1a1a1a] rounded-full pl-9 pr-4 py-1.5 text-xs outline-none transition-all text-white placeholder-slate-500"
        />
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-5">
        {/* Global Unit Switcher */}
        <GlobalUnitSwitcher />
        {/* Alerts & Metrics */}
        <div className="flex gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary text-[10px] font-medium text-primary cursor-pointer hover:bg-primary/10 transition-colors"
          >
            <Activity className="w-3 h-3" />
            Live Mode
          </motion.div>

          {isSuperAdmin && (
            <motion.div 
              whileHover={{ scale: 1.05 }}
              title={`Active Agents Breakdown: ${agentBreakdown.available} Available, ${agentBreakdown.busy} Busy, ${agentBreakdown.wrapUp} Wrap-up`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/40 bg-emerald-950/20 text-[10px] font-medium text-emerald-400 cursor-pointer hover:bg-emerald-900/30 transition-colors"
            >
              <Users className="w-3 h-3 text-emerald-400" />
              <span className="font-bold text-white">{activeAgentsCount !== null ? activeAgentsCount : '...'}</span>
              <span>Active Agents</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
            </motion.div>
          )}

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#333] bg-[#0a0a0a] text-[10px] font-medium text-slate-400 transition-colors"
          >
            <AlertTriangle className="w-3 h-3 text-slate-500" />
            0 Emergencies
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#333] bg-[#0a0a0a] text-[10px] font-medium text-slate-400"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
            0 in Queue
          </motion.div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#333]"></div>

        {/* Clock & Notifications */}
        <div className="flex items-center gap-5">
          <div className="text-sm font-semibold flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-400" />
            {timeStr}
          </div>
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-[#222]' : 'hover:bg-[#222]'}`}
            >
              <Bell className="w-5 h-5 text-slate-300" />
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-3 w-80 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-[#222] flex justify-between items-center bg-[#0a0a0a]">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    <button className="text-[10px] text-primary hover:underline font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scrollbar">
                    {mockNotifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-[#222] hover:bg-[#1a1a1a] transition-colors cursor-pointer ${n.unread ? 'bg-[#050505]' : 'opacity-70'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm ${n.unread ? 'text-white font-medium' : 'text-slate-400'}`}>{n.text}</p>
                          {n.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 ml-2"></span>}
                        </div>
                        <p className="text-[10px] text-slate-500">{n.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center border-t border-[#222] bg-[#0a0a0a] hover:bg-[#1a1a1a] cursor-pointer transition-colors text-xs text-slate-400 font-medium">
                    View All Notifications
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center gap-3 ml-2 border-l border-[#333] pl-6 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
              {userInitials}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-bold text-white leading-tight group-hover:text-primary transition-colors">{userName}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{userRole}</p>
            </div>
          </div>
          
          <AnimatePresence>
            {showProfileDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute right-0 mt-3 w-48 bg-[#111] border border-[#222] rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                <Link 
                  href="/agent/profile" 
                  onClick={() => setShowProfileDropdown(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  My Profile
                </Link>
                <button 
                  onClick={() => {
                    setShowProfileDropdown(false);
                    localStorage.removeItem('crm_token');
                    localStorage.removeItem('crm_user');
                    window.location.href = '/login';
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
