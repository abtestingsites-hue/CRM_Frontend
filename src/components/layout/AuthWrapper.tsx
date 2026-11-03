"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SocketProvider } from "@/providers/SocketProvider";
import { IncomingCallModal } from "@/components/call-center/IncomingCallModal";
import { LiveCallPanel } from "@/components/call-center/LiveCallPanel";
import { GlobalActiveCallWorkspace } from "@/components/call-center/GlobalActiveCallWorkspace";
import { AgentSidebar } from "@/components/agent-layout/AgentSidebar";
import { AgentNavbar } from "@/components/agent-layout/AgentNavbar";
import { useAuthStore } from "@/store/authStore";
import { AdminTicketToast } from "@/components/tickets/AdminTicketToast";
import { MobileHeader } from "./MobileHeader";
import { MobileDrawer } from "./MobileDrawer";
import { MobileBottomNav } from "./MobileBottomNav";

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const userRole = useAuthStore((state) => state.user?.role);

  useEffect(() => {
    const token = localStorage.getItem("crm_token");
    const userStr = localStorage.getItem("crm_user");
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        useAuthStore.getState().setUser(user);
      } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }
    }

    if (!token && pathname !== "/login") {
      router.push("/login");
    } else if (token && pathname === "/login") {
      let role = 'ADMIN';
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          role = user.role || 'ADMIN';
        } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }
      }
      
      if (role === 'AGENT') {
        router.push("/agent/dashboard");
      } else {
        router.push("/dashboard");
      }
    } else if (token && pathname !== "/login") {
      let role = 'ADMIN';
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          role = user.role || 'ADMIN';
        } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }
      }
      
      const isAgentPortalPath = pathname === '/agent' || (pathname.startsWith('/agent/') && pathname !== '/agent/profile');
      const isSharedPath = 
        pathname.startsWith('/calendar') || 
        pathname.startsWith('/targets') || 
        pathname.startsWith('/call-logs') || 
        pathname.startsWith('/call-history') || 
        pathname.startsWith('/sop') ||
        pathname === '/agent/profile';
      
      if (role === 'AGENT' && !isAgentPortalPath && !isSharedPath) {
        router.push('/agent/dashboard');
      } else if (role !== 'AGENT' && isAgentPortalPath) {
        router.push('/dashboard');
      } else {
        setIsAuthenticated(true);
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#000] flex items-center justify-center">
      <span className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>
    </div>;
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Use the actual role to determine the shell, defaulting to path check if role isn't loaded yet
  const shouldShowAgentShell = userRole === 'AGENT' || (!userRole && (pathname === '/agent' || pathname.startsWith('/agent/')));

  return (
    <SocketProvider>
      {/* Desktop Shell */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {shouldShowAgentShell ? <AgentSidebar /> : <Sidebar />}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
          {shouldShowAgentShell ? <AgentNavbar /> : <Navbar />}
          <main className="flex-1 overflow-y-auto bg-[#000] relative">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Shell */}
      <div className="flex md:hidden flex-col h-screen overflow-hidden bg-black text-white relative">
        <MobileHeader 
          shouldShowAgentShell={shouldShowAgentShell} 
          onOpenMenu={() => setIsDrawerOpen(true)} 
        />
        
        <MobileDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          shouldShowAgentShell={shouldShowAgentShell}
        />
        
        <main className="flex-1 overflow-y-auto bg-black text-white relative pb-16">
          {children}
        </main>

        <MobileBottomNav 
          shouldShowAgentShell={shouldShowAgentShell} 
        />
      </div>

      <IncomingCallModal />
      <LiveCallPanel />
      <GlobalActiveCallWorkspace />
      <AdminTicketToast />
    </SocketProvider>
  );
}
