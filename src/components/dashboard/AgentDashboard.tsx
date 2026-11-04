"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Phone, PhoneIncoming, PhoneMissed, PhoneForwarded, MessageSquare, 
  Ticket, CheckCircle2, Clock, Users, ArrowUpRight, Shield, 
  AlertTriangle, Flame, Sparkles, Building, Calendar, Layers, 
  Volume2, Play, ChevronRight, RefreshCw, X, ShieldAlert, Target,
  Plus, UserPlus
} from 'lucide-react';
import { api } from '@/lib/api';
import { useSocket } from '@/providers/SocketProvider';
import { useCallStore } from '@/store/useCallStore';
import { NumericKeypad } from '@/components/call-center/NumericKeypad';
import { CallIntakeFormModal } from '@/components/call-center/CallIntakeFormModal';

interface AgentDashboardProps {
  metrics?: any;
}

export function AgentDashboard({ metrics: initialMetrics }: AgentDashboardProps) {
  const router = useRouter();
  const { telephonySocket } = useSocket();
  const { activeCall, status: currentAgentStatus, setStatus } = useCallStore();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live elapsed shift timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Compact Dialpad modal state
  const [showDialpadModal, setShowDialpadModal] = useState(false);

  // Phase 27 Create Lead Intake Modal state
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [createLeadInitialPhone, setCreateLeadInitialPhone] = useState('');

  // Active call logs filter in chart
  const [chartOutcomeFilter, setChartOutcomeFilter] = useState<'all' | 'connected' | 'missed' | 'unanswered' | 'failed'>('all');

  // Load real agent dashboard metrics from backend
  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/analytics/agent-dashboard');
      if (res) {
        setDashboardData(res);
        if (res.header?.shiftDurationSeconds) {
          setElapsedSeconds(res.header.shiftDurationSeconds);
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch agent-dashboard endpoint:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to live WebSocket events to automatically refresh dashboard
  useEffect(() => {
    if (!telephonySocket) return;

    const handleCallEvent = () => {
      loadDashboardData();
    };

    telephonySocket.on('incoming_call', handleCallEvent);
    telephonySocket.on('callEnded', handleCallEvent);
    telephonySocket.on('callTransferCompleted', handleCallEvent);
    telephonySocket.on('agent_status_change', handleCallEvent);
    telephonySocket.on('ticketCreated', handleCallEvent);
    telephonySocket.on('ticketUpdated', handleCallEvent);

    return () => {
      telephonySocket.off('incoming_call', handleCallEvent);
      telephonySocket.off('callEnded', handleCallEvent);
      telephonySocket.off('callTransferCompleted', handleCallEvent);
      telephonySocket.off('agent_status_change', handleCallEvent);
      telephonySocket.off('ticketCreated', handleCallEvent);
      telephonySocket.off('ticketUpdated', handleCallEvent);
    };
  }, [telephonySocket, loadDashboardData]);

  // Time formatting helper
  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Data helpers with safe fallbacks
  const header = dashboardData?.header || {
    agentName: 'Care Coordinator',
    agentStatus: currentAgentStatus || 'AVAILABLE',
    callsHandledToday: initialMetrics?.totalCalls || 0,
    ticketsRaisedToday: initialMetrics?.assignedTickets || 0,
    ticketsResolvedToday: 0,
  };

  const kpis = dashboardData?.kpiCards || {
    callsConnected: initialMetrics?.callsConnected ?? initialMetrics?.totalCalls ?? 0,
    callsMissed: initialMetrics?.callsMissed ?? 0,
    notResponded: 0,
    unreadEnquiries: initialMetrics?.unreadMessages ?? 0,
    repliedEnquiries: 0,
    targetRemaining: 15,
    dailyTarget: 25,
    completedWork: initialMetrics?.totalCalls ?? 0,
    totalTicketsRaised: initialMetrics?.assignedTickets ?? 0,
    pendingTickets: 0,
  };

  const analytics = dashboardData?.analytics || {
    callLogsVolume: [],
    callLogsTotals: { connected: kpis.callsConnected, missed: kpis.callsMissed, unanswered: 0, failed: 0, total: kpis.callsConnected + kpis.callsMissed },
    queueCalls: { waiting: initialMetrics?.queueCalls ?? initialMetrics?.queuedCalls ?? 0, avgWaitTimeSec: 20, abandonmentRate: '0%' },
    transferCalls: { total: 0, completed: 0, cancelled: 0, byDepartment: [], recent: [] },
    newLeadsToday: { total: 0, byFoundation: [], bySource: [] },
    todayFollowups: { scheduled: 0, completed: 0, pending: 0, overdue: 0, list: [] },
    priorityLeads: [],
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 bg-[#050505] text-white min-h-screen">
      {/* 4.2 HEADER / AGENT WORK STATUS */}
      <div className="p-5 bg-gradient-to-r from-[#0d0d0d] via-[#111] to-[#0d0d0d] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        {/* Agent Info & Live Working Time */}
        <div className="flex items-center gap-4 z-10">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-orange-500/20 border border-orange-400/30">
              {header.agentName.charAt(0)}
            </div>
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0d0d0d] ${
              header.agentStatus === 'AVAILABLE'
                ? 'bg-emerald-500 shadow-emerald-500/50 shadow-md'
                : header.agentStatus === 'BUSY'
                ? 'bg-amber-500'
                : header.agentStatus === 'BREAK'
                ? 'bg-purple-500'
                : 'bg-slate-500'
            }`}></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{header.agentName}</h1>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                header.agentStatus === 'AVAILABLE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : header.agentStatus === 'BUSY'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
              }`}>
                {header.agentStatus}
              </span>
            </div>
            
            {/* Shift working-time duration counter */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <div className="flex items-center gap-1.5 font-mono text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-md border border-orange-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Shift Duration: <strong>{formatSeconds(elapsedSeconds)}</strong></span>
              </div>
              <span className="text-slate-600">•</span>
              <span>Calls Handled Today: <strong className="text-white">{header.callsHandledToday}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Tickets Raised: <strong className="text-white">{header.ticketsRaisedToday}</strong></span>
              <span className="text-slate-600">•</span>
              <span>Resolved: <strong className="text-emerald-400">{header.ticketsResolvedToday}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Compact Dialpad Launcher */}
        <div className="flex flex-wrap items-center gap-3 z-10 self-start lg:self-auto">
          <button
            onClick={() => setShowDialpadModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] hover:border-orange-500/40 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-md active:scale-95"
          >
            <Phone className="w-4 h-4 text-orange-500" />
            <span>Open Dialpad</span>
          </button>

          <button
            onClick={() => {
              setCreateLeadInitialPhone('');
              setShowCreateLeadModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 text-xs font-bold text-orange-400 hover:text-white flex items-center gap-2 transition-all shadow-md active:scale-95"
            title="Create Lead / Record Manual Enquiry"
          >
            <Plus className="w-4 h-4 text-orange-400" />
            <span>Create Lead</span>
          </button>

          <button
            onClick={() => router.push('/call-logs')}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white flex items-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
          >
            <Layers className="w-4 h-4" />
            <span>Call Logs</span>
          </button>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 w-80 h-full bg-orange-500/5 blur-3xl pointer-events-none"></div>
      </div>

      {/* 4.3 8 KPI CARDS GRID WITH REAL ACTION ROUTING */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Calls Connected */}
        <div 
          onClick={() => router.push('/call-logs?status=CONNECTED&group=today')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1811] to-[#0e2417] border border-emerald-500/30 hover:border-emerald-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-emerald-400/90">Calls Connected</span>
            <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
              <PhoneIncoming className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.callsConnected}</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1 font-medium">
              <span>Answered calls today</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 2. Total Calls Missed */}
        <div 
          onClick={() => router.push('/call-logs?status=MISSED&group=today')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#18110c] to-[#24170e] border border-amber-500/30 hover:border-amber-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-amber-400/90">Calls Missed</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-all">
              <PhoneMissed className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.callsMissed}</div>
            <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-medium">
              <span>Inbound missed calls</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 3. Not Responded */}
        <div 
          onClick={() => router.push('/omnichannel?filter=not_responded')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#180c0e] to-[#240e13] border border-rose-500/30 hover:border-rose-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-rose-400/90">Not Responded</span>
            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400 group-hover:bg-rose-500/20 transition-all">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.notResponded}</div>
            <div className="flex items-center gap-1 text-[10px] text-rose-400 mt-1 font-medium">
              <span>Over SLA response rule</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 4. Omnichannel Unread Enquiries */}
        <div 
          onClick={() => router.push('/omnichannel?filter=unread')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1318] to-[#0e1d24] border border-blue-500/30 hover:border-blue-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-blue-400/90">Unread Enquiries</span>
            <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition-all">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.unreadEnquiries}</div>
            <div className="flex items-center gap-1 text-[10px] text-blue-400 mt-1 font-medium">
              <span>Awaiting agent read</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 5. Omnichannel Replied */}
        <div 
          onClick={() => router.push('/omnichannel?filter=replied')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#140c18] to-[#1c0e24] border border-purple-500/30 hover:border-purple-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-purple-400/90">Replied Today</span>
            <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 group-hover:bg-purple-500/20 transition-all">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.repliedEnquiries}</div>
            <div className="flex items-center gap-1 text-[10px] text-purple-400 mt-1 font-medium">
              <span>Conversations responded</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 6. Today's Target Remaining */}
        <div 
          onClick={() => router.push('/targets')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1818] to-[#0e2424] border border-cyan-500/30 hover:border-cyan-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-cyan-400/90">Target Remaining</span>
            <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.targetRemaining}</div>
            <div className="w-full bg-[#162222] h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-cyan-400 h-full rounded-full transition-all" 
                style={{ width: `${Math.min(((kpis.completedWork || 0) / (kpis.dailyTarget || 25)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>{kpis.completedWork} completed</span>
              <span>{kpis.dailyTarget} goal</span>
            </div>
          </div>
        </div>

        {/* 7. Total Tickets Raised */}
        <div 
          onClick={() => router.push('/tickets')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#18130c] to-[#241c0e] border border-amber-500/30 hover:border-amber-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-amber-400/90">Total Tickets Raised</span>
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-all">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.totalTicketsRaised ?? 0}</div>
            <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-medium">
              <span>Created by agent</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>

        {/* 8. Pending Tickets */}
        <div 
          onClick={() => router.push('/agent/tickets')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#1c120c] to-[#26170e] border border-orange-500/30 hover:border-orange-500/60 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5 group flex flex-col justify-between h-[130px]"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-orange-400/90">Pending Tickets</span>
            <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400 group-hover:bg-orange-500/20 transition-all">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{kpis.pendingTickets ?? 0}</div>
            <div className="flex items-center gap-1 text-[10px] text-orange-400 mt-1 font-medium">
              <span>Assigned awaiting resolution</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-70 group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </div>

      {/* 4.4 SIX SEPARATE ANALYTICAL CHARTS / VISUAL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: CALL LOGS VOLUME OVER TIME */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-500" />
                Call Logs Volume (24 Hours)
              </h2>
              <p className="text-xs text-slate-400">Distribution of today&apos;s call volume across outcome categories</p>
            </div>
            <button
              onClick={() => router.push('/call-logs')}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Full History</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Outcome Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-4 text-[11px]">
            <button
              onClick={() => setChartOutcomeFilter('all')}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                chartOutcomeFilter === 'all'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : 'bg-[#141414] text-slate-400 border-[#222]'
              }`}
            >
              Total: {analytics.callLogsTotals?.total || 0}
            </button>
            <button
              onClick={() => setChartOutcomeFilter('connected')}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                chartOutcomeFilter === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-[#141414] text-slate-400 border-[#222]'
              }`}
            >
              Connected: {analytics.callLogsTotals?.connected || 0}
            </button>
            <button
              onClick={() => setChartOutcomeFilter('missed')}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                chartOutcomeFilter === 'missed'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-[#141414] text-slate-400 border-[#222]'
              }`}
            >
              Missed: {analytics.callLogsTotals?.missed || 0}
            </button>
            <button
              onClick={() => setChartOutcomeFilter('unanswered')}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                chartOutcomeFilter === 'unanswered'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                  : 'bg-[#141414] text-slate-400 border-[#222]'
              }`}
            >
              Unanswered: {analytics.callLogsTotals?.unanswered || 0}
            </button>
          </div>

          {/* Hourly Volume Bar Visualization */}
          <div className="flex-1 flex items-end gap-1.5 h-36 pt-6 pb-2 px-2 bg-[#101010] rounded-xl border border-[#1a1a1a]">
            {(analytics.callLogsVolume?.length ? analytics.callLogsVolume : Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, total: 0, connected: 0, missed: 0, unanswered: 0, failed: 0 }))).slice(8, 20).map((hourData: any, i: number) => {
              const val = chartOutcomeFilter === 'connected'
                ? hourData.connected
                : chartOutcomeFilter === 'missed'
                ? hourData.missed
                : chartOutcomeFilter === 'unanswered'
                ? hourData.unanswered
                : hourData.total;
              const maxVal = Math.max(...(analytics.callLogsVolume || []).map((h: any) => h.total || 0), 5);
              const heightPct = Math.max(Math.round((val / maxVal) * 100), 8);

              return (
                <div 
                  key={i} 
                  className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                  onClick={() => router.push(`/call-logs?group=today`)}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-[#1e1e1e] border border-[#333] px-2 py-0.5 rounded text-[9px] font-mono text-white pointer-events-none transition-opacity whitespace-nowrap z-20">
                    {hourData.hour}: {val} calls
                  </div>

                  <div 
                    className={`w-full rounded-t-sm transition-all ${
                      chartOutcomeFilter === 'connected'
                        ? 'bg-emerald-500 group-hover:bg-emerald-400'
                        : chartOutcomeFilter === 'missed'
                        ? 'bg-amber-500 group-hover:bg-amber-400'
                        : 'bg-orange-500 group-hover:bg-orange-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  ></div>
                  <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">
                    {hourData.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL B: LIVE QUEUE CALLS */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Live Queue Calls
                </h2>
                <p className="text-xs text-slate-400">Incoming call traffic, wait times and SLA threshold</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Live Sync
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 bg-[#121212] border border-[#1e1e1e] rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">In Queue</span>
                <div className="text-2xl font-extrabold text-cyan-400 mt-0.5">{analytics.queueCalls?.waiting || 0}</div>
              </div>
              <div className="p-3.5 bg-[#121212] border border-[#1e1e1e] rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avg Wait Time</span>
                <div className="text-2xl font-extrabold text-white mt-0.5">{analytics.queueCalls?.avgWaitTimeSec || 0}s</div>
              </div>
              <div className="p-3.5 bg-[#121212] border border-[#1e1e1e] rounded-xl text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Abandon Rate</span>
                <div className="text-2xl font-extrabold text-amber-400 mt-0.5">{analytics.queueCalls?.abandonmentRate || '0%'}</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#121212] border border-[#1c1c1c] rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Ready to accept queue calls?</span>
            <button
              onClick={() => setStatus('AVAILABLE')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-sm"
            >
              Set Available
            </button>
          </div>
        </div>

        {/* PANEL C: TRANSFER CALLS DIRECTORY & RECENT AUDITS */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PhoneForwarded className="w-4 h-4 text-cyan-400" />
                  Transfer Calls Activity
                </h2>
                <p className="text-xs text-slate-400">Department shifts, handoffs and outcomes</p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">{analytics.transferCalls?.completed || 0} Completed</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-semibold">{analytics.transferCalls?.total || 0} Total</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {analytics.transferCalls?.byDepartment?.length > 0 ? (
                analytics.transferCalls.byDepartment.map((deptData: any, i: number) => (
                  <div key={i} className="p-3 bg-[#121212] border border-[#1e1e1e] rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{deptData.department}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono">{deptData.completed} completed</span>
                      <span className="text-slate-500 font-mono">{deptData.total} requested</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#121212] border border-[#1c1c1c] rounded-xl text-center text-xs text-slate-500">
                  No inter-department call transfers recorded today
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push('/call-logs?transferStatus=TRANSFERRED')}
            className="w-full py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all text-center"
          >
            View Complete Transfer Logs
          </button>
        </div>

        {/* PANEL D: NEW LEADS TODAY BREAKDOWN */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  New Leads Today
                </h2>
                <p className="text-xs text-slate-400">Breakdown by foundation and service channel</p>
              </div>
              <button
                onClick={() => router.push('/leads/pool')}
                className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
              >
                <span>Lead Pool</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {analytics.newLeadsToday?.byFoundation?.length > 0 ? (
                analytics.newLeadsToday.byFoundation.map((f: any, i: number) => (
                  <div key={i} className="p-3 bg-[#121212] border border-[#1e1e1e] rounded-xl">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{f.name || 'Foundation'}</span>
                    <div className="text-xl font-bold text-white mt-0.5">{f.count} leads</div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-4 bg-[#121212] border border-[#1c1c1c] rounded-xl text-center text-xs text-slate-500">
                  No new leads ingested yet today
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-400 pt-2 border-t border-[#181818]">
            <span className="text-slate-500 font-semibold">Sources:</span>
            {analytics.newLeadsToday?.bySource?.map((s: any, i: number) => (
              <span key={i} className="bg-[#141414] px-2 py-0.5 rounded border border-[#222] text-[11px] text-slate-300">
                {s.source}: {s.count}
              </span>
            ))}
          </div>
        </div>

        {/* PANEL E: TODAY'S FOLLOW-UPS QUEUE */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Today&apos;s Follow-ups Queue
                </h2>
                <p className="text-xs text-slate-400">Scheduled, pending and overdue callbacks</p>
              </div>
              <div className="flex gap-2 text-[11px] font-semibold">
                <span className="text-amber-400">{analytics.todayFollowups?.pending || 0} Pending</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400">{analytics.todayFollowups?.completed || 0} Done</span>
              </div>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
              {analytics.todayFollowups?.list?.length > 0 ? (
                analytics.todayFollowups.list.map((item: any) => (
                  <div key={item.id} className="p-3 bg-[#121212] border border-[#1e1e1e] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{item.leadName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{item.phoneNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#121212] border border-[#1c1c1c] rounded-xl text-center text-xs text-slate-500">
                  No callbacks scheduled for today
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push('/calendar')}
            className="w-full py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all text-center"
          >
            Open Full Calendar Log
          </button>
        </div>

        {/* PANEL F: PRIORITY-BASED NEW LEADS (EMERGENCY PINNED) */}
        <div className="p-6 bg-[#0b0b0b] border border-[#1e1e1e] rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  Priority-Based Leads Queue
                </h2>
                <p className="text-xs text-slate-400">Emergency & High priority intake requests</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Critical First
              </span>
            </div>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
              {analytics.priorityLeads?.length > 0 ? (
                analytics.priorityLeads.map((lead: any) => (
                  <div 
                    key={lead.id}
                    onClick={() => router.push(`/leads/pool?leadId=${lead.id}`)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                      lead.isEmergency || lead.priority === 'EMERGENCY'
                        ? 'bg-rose-950/20 border-rose-500/50 hover:border-rose-500 shadow-md shadow-rose-950/20 animate-pulse'
                        : lead.priority === 'HIGH'
                        ? 'bg-[#18120c] border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-[#121212] border-[#1e1e1e] hover:border-[#2a2a2a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{lead.name}</span>
                        {lead.isEmergency && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white px-1.5 py-0.2 rounded">
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{lead.service} • {lead.foundation}</p>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lead.priority === 'EMERGENCY'
                          ? 'bg-rose-500/20 text-rose-300'
                          : lead.priority === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}>
                        {lead.priority}
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">{lead.phone}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-[#121212] border border-[#1c1c1c] rounded-xl text-center text-xs text-slate-500">
                  No active priority leads in queue
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => router.push('/leads/pool')}
            className="w-full py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all text-center"
          >
            Review All Ingested Leads
          </button>
        </div>
      </div>

      {/* 4.5 COMPACT DIALPAD MODAL REUSING NUMERICKEYPAD */}
      {showDialpadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0e0e0e] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl relative text-white">
            <div className="p-4 border-b border-[#1e1e1e] flex items-center justify-between bg-[#121212]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-500" />
                <h3 className="font-bold text-sm text-white">Telephony Dialpad</h3>
              </div>
              <button
                onClick={() => setShowDialpadModal(false)}
                className="w-7 h-7 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              <NumericKeypad 
                onCallInitiated={() => setShowDialpadModal(false)}
                onCreateLead={(typedPhone) => {
                  setShowDialpadModal(false);
                  setCreateLeadInitialPhone(typedPhone || '');
                  setShowCreateLeadModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PHASE 27 CREATE LEAD MODAL */}
      {showCreateLeadModal && (
        <CallIntakeFormModal
          isOpen={showCreateLeadModal}
          phoneNumber={createLeadInitialPhone}
          onClose={() => {
            setShowCreateLeadModal(false);
            setCreateLeadInitialPhone('');
          }}
          onSuccess={() => {
            setShowCreateLeadModal(false);
            setCreateLeadInitialPhone('');
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
}
