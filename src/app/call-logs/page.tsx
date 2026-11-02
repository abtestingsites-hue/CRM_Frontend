"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, Search, Filter, 
  Calendar, Clock, User, Shield, Play, Pause, FileText, 
  RefreshCw, CheckCircle2, AlertTriangle, ArrowUpDown, 
  ChevronLeft, ChevronRight, Share2, Layers, Send, 
  MessageSquare, Mail, Building, Sparkles, Check, AlertCircle,
  PhoneCall, CornerDownRight, Loader2, Volume2, ExternalLink
} from 'lucide-react';
import { api, sanitizeRecordingUrl } from '@/lib/api';
import { CallHistoryDrawer } from '@/components/call-center/CallHistoryDrawer';
import { CustomerHistoryDrawer } from '@/components/call-center/CustomerHistoryDrawer';
import { CrossUnitTransferModal } from '@/components/call-center/CrossUnitTransferModal';

function CallLogsContent() {
  const searchParams = useSearchParams();
  const initialGroup = (searchParams.get('group') as any) || 'all';
  const initialStatus = searchParams.get('status') || '';
  const initialTransfer = searchParams.get('transferStatus') || '';

  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group filter: 'all' | 'today' | 'yesterday' | 'earlier'
  const [activeGroup, setActiveGroup] = useState<'all' | 'today' | 'yesterday' | 'earlier'>(initialGroup);
  const [groupCounts, setGroupCounts] = useState({
    today: 0,
    yesterday: 0,
    earlierDates: 0,
    all: 0,
  });

  // Today KPIs (from Asia/Kolkata timezone persisted data)
  const [todayKpis, setTodayKpis] = useState({
    totalCallsToday: 0,
    totalConnectedToday: 0,
    totalMissedToday: 0,
    totalOutboundToday: 0,
    totalInboundToday: 0,
    totalTransferredToday: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedDirection, setSelectedDirection] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedFoundation, setSelectedFoundation] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [recordingOnly, setRecordingOnly] = useState('');
  const [transferOnly, setTransferOnly] = useState(initialTransfer);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter options
  const [departments, setDepartments] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  // Drawers & Modals
  const [selectedCallIdForDrawer, setSelectedCallIdForDrawer] = useState<string | null>(null);
  const [isCallDrawerOpen, setIsCallDrawerOpen] = useState(false);

  const [selectedCustomerIdentifier, setSelectedCustomerIdentifier] = useState<string | null>(null);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);

  const [leadForTransfer, setLeadForTransfer] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Inline audio playback state
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Inline Omnichannel message composing state per call row
  // Key: callId -> { channel: 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM', message: string, isSending: boolean, statusText: string | null, isSuccess: boolean }
  const [rowMessageState, setRowMessageState] = useState<Record<string, {
    channel: string;
    message: string;
    isSending: boolean;
    statusText: string | null;
    isSuccess: boolean;
  }>>({});

  // Expandable summary state per call row
  const [expandedSummaryCallIds, setExpandedSummaryCallIds] = useState<Record<string, boolean>>({});

  // Fetch departments & agents for dropdown filters
  useEffect(() => {
    api.get('/telephony/departments')
      .then((res) => {
        if (res?.departments) setDepartments(res.departments);
        if (res?.allAgents) setAgents(res.allAgents);
      })
      .catch((e) => console.warn('Could not load filter metadata:', e));
  }, []);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      if (activeGroup !== 'all') params.set('group', activeGroup);
      if (search) params.set('search', search);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedDirection) params.set('direction', selectedDirection);
      if (selectedDepartment) params.set('department', selectedDepartment);
      if (selectedAgent) params.set('agentId', selectedAgent);
      if (selectedFoundation) params.set('foundation', selectedFoundation);
      if (selectedService) params.set('service', selectedService);
      if (recordingOnly) params.set('recordingAvailable', recordingOnly);
      if (transferOnly) params.set('transferStatus', transferOnly);

      const res = await api.get(`/telephony/call-history?${params.toString()}`);
      if (res && res.calls) {
        setCalls(res.calls);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);

        if (res.groupCounts) {
          setGroupCounts({
            today: res.groupCounts.today || 0,
            yesterday: res.groupCounts.yesterday || 0,
            earlierDates: res.groupCounts.earlierDates || (res.groupCounts.earlierThisWeek + res.groupCounts.previousWeeks + res.groupCounts.older) || 0,
            all: res.pagination?.total || 0,
          });
        }

        if (res.todayKpis) {
          setTodayKpis(res.todayKpis);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }, [
    page, limit, activeGroup, search, selectedStatus, selectedDirection, 
    selectedDepartment, selectedAgent, selectedFoundation, selectedService, 
    recordingOnly, transferOnly
  ]);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Handle inline audio play/pause
  const togglePlayAudio = (call: any) => {
    const rawUrl = call.recordingUrl;
    if (!rawUrl) return;
    const cleanUrl = sanitizeRecordingUrl(rawUrl);
    if (!cleanUrl) return;

    if (playingCallId === call.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingCallId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(cleanUrl);
      audio.onended = () => setPlayingCallId(null);
      audio.onerror = () => setPlayingCallId(null);
      audio.play().catch((e) => console.warn('Audio play prevented:', e));
      audioPlayerRef.current = audio;
      setPlayingCallId(call.id);
    }
  };

  // Handle row message state change
  const setRowChannel = (callId: string, channel: string) => {
    setRowMessageState((prev) => ({
      ...prev,
      [callId]: {
        ...(prev[callId] || { message: '', isSending: false, statusText: null, isSuccess: false }),
        channel,
      },
    }));
  };

  const setRowText = (callId: string, message: string) => {
    setRowMessageState((prev) => ({
      ...prev,
      [callId]: {
        ...(prev[callId] || { channel: 'WHATSAPP', isSending: false, statusText: null, isSuccess: false }),
        message,
      },
    }));
  };

  // Handle Send Button click
  const handleSendMessage = async (call: any) => {
    const cur = rowMessageState[call.id] || { channel: 'WHATSAPP', message: '', isSending: false, statusText: null, isSuccess: false };
    const text = (cur.message || '').trim();
    if (!text) return;

    const channel = cur.channel || 'WHATSAPP';
    let recipient: string | null = null;
    let missingError = '';

    if (channel === 'EMAIL') {
      recipient = call.customerEmail || call.customerDetails?.email || null;
      missingError = 'No customer email address on file for Email delivery';
    } else if (channel === 'INSTAGRAM') {
      recipient =
        call.customerDetails?.platformUserId ||
        call.customer?.platformUserId ||
        call.platformUserId ||
        (call.callerPhone?.startsWith('ig_') ? call.callerPhone.slice(3) : null) ||
        null;
      missingError = 'No Instagram User ID (IGSID) on file for this contact. Instagram DMs require an Instagram User ID.';
    } else {
      // WHATSAPP
      const rawPhone = call.callerPhone || call.customerDetails?.phone;
      recipient = (rawPhone && !rawPhone.startsWith('ig_')) ? rawPhone : null;
      missingError = 'No valid phone number on file for WhatsApp delivery';
    }

    if (!recipient) {
      setRowMessageState((prev) => ({
        ...prev,
        [call.id]: {
          ...cur,
          statusText: missingError,
          isSuccess: false,
        },
      }));
      return;
    }

    setRowMessageState((prev) => ({
      ...prev,
      [call.id]: { ...cur, isSending: true, statusText: null, isSuccess: false },
    }));

    try {
      const res = await api.post(`/telephony/calls/${encodeURIComponent(call.id)}/send-message`, {
        channel,
        recipient,
        message: text,
        leadId: call.leadId || undefined,
      });

      if (res?.success) {
        setRowMessageState((prev) => ({
          ...prev,
          [call.id]: {
            channel,
            message: '', // clear message on success
            isSending: false,
            statusText: `Sent via ${channel} (ID: ${res.providerMessageId || 'Confirmed'})`,
            isSuccess: true,
          },
        }));

        setTimeout(() => {
          setRowMessageState((prev) => {
            const copy = { ...prev };
            if (copy[call.id]) copy[call.id].statusText = null;
            return copy;
          });
        }, 5000);
      } else {
        setRowMessageState((prev) => ({
          ...prev,
          [call.id]: {
            ...cur,
            isSending: false,
            statusText: res?.message || 'Failed to dispatch message',
            isSuccess: false,
          },
        }));
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || 'Delivery failed';
      setRowMessageState((prev) => ({
        ...prev,
        [call.id]: {
          ...cur,
          isSending: false,
          statusText: serverMsg,
          isSuccess: false,
        },
      }));
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('');
    setSelectedDirection('');
    setSelectedDepartment('');
    setSelectedAgent('');
    setSelectedFoundation('');
    setSelectedService('');
    setRecordingOnly('');
    setTransferOnly('');
    setActiveGroup('all');
    setPage(1);
  };

  // KPI card click actions to filter list
  const applyKpiFilter = (type: 'connected' | 'missed' | 'outbound' | 'inbound' | 'transferred' | 'all') => {
    setActiveGroup('today');
    setPage(1);
    if (type === 'connected') {
      setSelectedStatus('CONNECTED');
      setSelectedDirection('');
      setTransferOnly('');
    } else if (type === 'missed') {
      setSelectedStatus('MISSED');
      setSelectedDirection('INBOUND');
      setTransferOnly('');
    } else if (type === 'outbound') {
      setSelectedDirection('OUTBOUND');
      setSelectedStatus('');
      setTransferOnly('');
    } else if (type === 'inbound') {
      setSelectedDirection('INBOUND');
      setSelectedStatus('');
      setTransferOnly('');
    } else if (type === 'transferred') {
      setTransferOnly('TRANSFERRED');
      setSelectedStatus('');
      setSelectedDirection('');
    } else {
      setSelectedStatus('');
      setSelectedDirection('');
      setTransferOnly('');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#070707] text-white">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-[#1a1a1a] bg-[#090909] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-orange-500" />
              Call Logs & Messaging Hub Communication
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live contact-center call logs, recordings, AI summaries, direct multichannel responses, and cross-unit history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadCalls()}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#222] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* MODULE 1.2 — CALL LOGS HEADER KPI CARDS (Asia/Kolkata timezone calculated) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Total Calls Today */}
            <div
              onClick={() => applyKpiFilter('all')}
              className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] hover:border-orange-500/40 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Today</span>
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                {todayKpis.totalCallsToday}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Click to view all</span>
            </div>

            {/* 2. Total Connected Today (CRITICAL MINIMUM REQUIRED KPI) */}
            <div
              onClick={() => applyKpiFilter('connected')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/20 to-[#0e0e0e] border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer transition-all shadow-md group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Connected Today</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-extrabold text-emerald-400 group-hover:scale-105 transition-transform">
                {todayKpis.totalConnectedToday}
              </div>
              <span className="text-[10px] text-emerald-500/70 mt-1 block font-medium">Verified connected</span>
            </div>

            {/* 3. Total Missed Today */}
            <div
              onClick={() => applyKpiFilter('missed')}
              className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] hover:border-rose-500/40 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missed Today</span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-rose-400 group-hover:text-rose-300 transition-colors">
                {todayKpis.totalMissedToday}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Inbound missed</span>
            </div>

            {/* 4. Total Outbound Today */}
            <div
              onClick={() => applyKpiFilter('outbound')}
              className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] hover:border-blue-500/40 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outbound</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <PhoneOutgoing className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {todayKpis.totalOutboundToday}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Agent dials</span>
            </div>

            {/* 5. Total Inbound Today */}
            <div
              onClick={() => applyKpiFilter('inbound')}
              className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] hover:border-purple-500/40 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inbound</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <PhoneIncoming className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                {todayKpis.totalInboundToday}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Customer calls</span>
            </div>

            {/* 6. Total Transferred Today */}
            <div
              onClick={() => applyKpiFilter('transferred')}
              className="p-3.5 rounded-2xl bg-[#0e0e0e] border border-[#1e1e1e] hover:border-amber-500/40 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transferred</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <CornerDownRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold text-amber-400 group-hover:text-amber-300 transition-colors">
                {todayKpis.totalTransferredToday}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">Unit handoffs</span>
            </div>
          </div>

          {/* MODULE 1.3 — DATE-WISE CALL HISTORY TABS & FILTERS */}
          <div className="space-y-4">
            {/* Date Group Tabs */}
            <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-3 overflow-x-auto">
              <button
                onClick={() => { setActiveGroup('all'); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  activeGroup === 'all'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#121212] text-slate-400 hover:text-white border border-[#222]'
                }`}
              >
                <span>All Logs</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{groupCounts.all}</span>
              </button>

              <button
                onClick={() => { setActiveGroup('today'); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  activeGroup === 'today'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#121212] text-slate-400 hover:text-white border border-[#222]'
                }`}
              >
                <span>Today</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{groupCounts.today}</span>
              </button>

              <button
                onClick={() => { setActiveGroup('yesterday'); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  activeGroup === 'yesterday'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#121212] text-slate-400 hover:text-white border border-[#222]'
                }`}
              >
                <span>Yesterday</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{groupCounts.yesterday}</span>
              </button>

              <button
                onClick={() => { setActiveGroup('earlier'); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                  activeGroup === 'earlier'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-[#121212] text-slate-400 hover:text-white border border-[#222]'
                }`}
              >
                <span>Earlier Dates</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/30 text-[10px]">{groupCounts.earlierDates}</span>
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-[#0d0d0d] border border-[#1e1e1e] flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search caller name, phone number, lead..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Status */}
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Statuses</option>
                <option value="CONNECTED">Connected</option>
                <option value="MISSED">Missed</option>
                <option value="UNANSWERED">Unanswered</option>
                <option value="BUSY">Busy</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>

              {/* Direction */}
              <select
                value={selectedDirection}
                onChange={(e) => { setSelectedDirection(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Directions</option>
                <option value="INBOUND">Inbound</option>
                <option value="OUTBOUND">Outbound</option>
              </select>

              {/* Department */}
              <select
                value={selectedDepartment}
                onChange={(e) => { setSelectedDepartment(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>

              {/* Agent */}
              <select
                value={selectedAgent}
                onChange={(e) => { setSelectedAgent(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500 max-w-[150px]"
              >
                <option value="">All Agents</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {/* Foundation */}
              <select
                value={selectedFoundation}
                onChange={(e) => { setSelectedFoundation(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">All Foundations</option>
                <option value="Care Management">Care Management</option>
                <option value="Home Care">Home Care</option>
                <option value="Ambulance Services">Ambulance Services</option>
              </select>

              {/* Required Service */}
              <select
                value={selectedService}
                onChange={(e) => { setSelectedService(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500 max-w-[160px]"
              >
                <option value="">All Services</option>
                <option value="Doctor at Home">Doctor at Home</option>
                <option value="Nursing Care at Home">Nursing Care at Home</option>
                <option value="Care at Home">Care at Home</option>
                <option value="Ambulance Services">Ambulance Services</option>
                <option value="Assisted Living">Assisted Living</option>
                <option value="Dementia / Alzheimer's Care">Dementia Care</option>
                <option value="Post-operative Care">Post-operative Care</option>
                <option value="Palliative Care">Palliative Care</option>
              </select>

              {/* Recording Only */}
              <select
                value={recordingOnly}
                onChange={(e) => { setRecordingOnly(e.target.value); setPage(1); }}
                className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">Recordings (All)</option>
                <option value="true">Audio Available</option>
                <option value="false">No Audio</option>
              </select>

              {/* Reset Filters */}
              {(search || selectedStatus || selectedDirection || selectedDepartment || selectedAgent || selectedFoundation || selectedService || recordingOnly || transferOnly) && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* MODULE 2 — CALL LOGS TABLE WITH ALL 9 REQUIRED COLUMNS */}
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#1e1e1e] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead>
                  <tr className="border-b border-[#1c1c1c] bg-[#0e0e0e] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {/* Caller Name */}
                    <th className="py-3 px-4 w-[160px]">Caller Name</th>
                    {/* Handled By */}
                    <th className="py-3 px-4 w-[150px]">Handled By</th>
                    {/* Call Record */}
                    <th className="py-3 px-4 w-[140px]">Call Record</th>
                    {/* Call Summary */}
                    <th className="py-3 px-4 w-[240px]">Call Summary</th>
                    {/* Required Service */}
                    <th className="py-3 px-4 w-[130px]">Required Service</th>
                    {/* Source */}
                    <th className="py-3 px-4 w-[100px]">Source</th>
                    {/* Messaging Hub */}
                    <th className="py-3 px-4 w-[140px]">Messaging Hub</th>
                    {/* Response Message */}
                    <th className="py-3 px-4 w-[220px]">Response Message</th>
                    {/* Actions */}
                    <th className="py-3 px-4 w-[100px] text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#161616] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                        <span>Loading call records & messaging channels...</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-rose-400">
                        {error}
                      </td>
                    </tr>
                  ) : calls.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500">
                        No call records match the current filter selection.
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => {
                      const curMsg = rowMessageState[call.id] || {
                        channel: 'WHATSAPP',
                        message: '',
                        isSending: false,
                        statusText: null,
                        isSuccess: false,
                      };

                      const isSummaryExpanded = !!expandedSummaryCallIds[call.id];
                      const isPlaying = playingCallId === call.id;

                      return (
                        <tr
                          key={call.id}
                          className="hover:bg-[#0f0f0f] transition-colors group align-top"
                        >
                          {/* 1. Caller Name */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedCustomerIdentifier(call.callerPhone || call.leadId || call.id);
                                  setIsCustomerDrawerOpen(true);
                                }}
                                className="font-bold text-white hover:text-orange-400 transition-colors text-left flex items-center gap-1.5 group/btn"
                                title="Open Cross-Unit Customer Intelligence"
                              >
                                <span className="truncate max-w-[120px]">{call.callerName}</span>
                                <ExternalLink className="w-3 h-3 text-slate-600 group-hover/btn:text-orange-400 shrink-0" />
                              </button>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {call.callerPhone}
                              </p>
                              {call.priority === 'EMERGENCY' && (
                                <span className="inline-block px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-extrabold uppercase animate-pulse">
                                  Emergency
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 block">
                                {new Date(call.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          {/* 2. Handled By */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-medium text-slate-200">
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[110px]">{call.handlingAgent?.name || 'Unassigned'}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-600" />
                                {call.department || 'General'}
                              </span>
                              {call.isTransferred && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCallIdForDrawer(call.id);
                                    setIsCallDrawerOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-semibold border border-amber-500/30 transition-all text-left"
                                  title="View complete transfer transmission chain and audio handover details"
                                >
                                  <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate max-w-[125px]">
                                    {call.transferredFrom && call.transferredTo 
                                      ? `${call.transferredFrom} ➔ ${call.transferredTo}`
                                      : `Transferred (${call.transferCount})`}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 3. Call Record */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              {call.recordingStatus === 'READY' && call.recordingUrl ? (
                                <div className="space-y-1">
                                  <button
                                    onClick={() => togglePlayAudio(call)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                                      isPlaying
                                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                  >
                                    {isPlaying ? (
                                      <>
                                        <Pause className="w-3 h-3" />
                                        <span>Pause</span>
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3 h-3 fill-current" />
                                        <span>Playback</span>
                                      </>
                                    )}
                                  </button>
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                                    <Clock className="w-2.5 h-2.5" />
                                    {Math.floor((call.recordingDuration || call.duration) / 60)}m {((call.recordingDuration || call.duration) % 60)}s
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-[11px] text-slate-500 block">
                                    {call.status === 'MISSED' ? 'Missed Call' : 'Recording Unavailable'}
                                  </span>
                                  <span className="text-[10px] text-slate-600 font-mono">
                                    Duration: {call.duration || 0}s
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 4. Call Summary */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {call.summary ? (
                                <>
                                  <p className={`text-xs text-slate-300 leading-relaxed ${
                                    isSummaryExpanded ? '' : 'line-clamp-2'
                                  }`}>
                                    {call.summary}
                                  </p>
                                  <div className="flex items-center gap-2 pt-0.5">
                                    {call.recordingStoragePath || call.recordingUrl ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        AI Transcript-verified
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-[#2a2a2a]">
                                        Metadata fallback
                                      </span>
                                    )}
                                    <button
                                      onClick={() => {
                                        setExpandedSummaryCallIds(prev => ({
                                          ...prev,
                                          [call.id]: !prev[call.id]
                                        }));
                                      }}
                                      className="text-[10px] text-orange-400 hover:underline"
                                    >
                                      {isSummaryExpanded ? 'Collapse' : 'Expand full'}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1">
                                  <span className="text-xs text-slate-500 italic block">
                                    {call.disposition || 'Call logged'}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-[#2a2a2a]">
                                    Metadata fallback
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Required Service */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className="inline-block px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                                {call.requiredService || 'Doctor at Home'}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {call.foundation || 'General Service'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Source */}
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-slate-300 text-[11px] font-medium">
                              {call.source || 'Inbound Call'}
                            </span>
                          </td>

                          {/* 7. Omnichannel to Communicate */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1.5">
                              <select
                                value={curMsg.channel}
                                onChange={(e) => setRowChannel(call.id, e.target.value)}
                                className="w-full bg-[#121212] border border-[#282828] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-orange-500"
                              >
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="EMAIL">Email</option>
                                <option value="INSTAGRAM">Instagram</option>
                              </select>

                              {/* Destination Info */}
                              <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[130px]">
                                {curMsg.channel === 'EMAIL'
                                  ? (call.customerEmail || call.customerDetails?.email || 'No email')
                                  : (curMsg.channel === 'INSTAGRAM'
                                      ? (call.customerDetails?.platformUserId
                                          ? (call.customerDetails.instagramUsername ? `@${call.customerDetails.instagramUsername}` : `ID: ${call.customerDetails.platformUserId}`)
                                          : 'No IG ID')
                                      : (call.callerPhone && !call.callerPhone.startsWith('ig_') ? call.callerPhone : (call.customerDetails?.phone || 'No phone')))}
                              </span>
                            </div>
                          </td>

                          {/* 8. Response Message */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <textarea
                                rows={2}
                                value={curMsg.message}
                                onChange={(e) => setRowText(call.id, e.target.value)}
                                placeholder={`Write ${curMsg.channel.toLowerCase()} message...`}
                                disabled={curMsg.isSending}
                                className="w-full bg-[#141414] border border-[#262626] rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                              />

                              {/* Feedback / Status */}
                              {curMsg.statusText && (
                                <span className={`text-[10px] font-medium block truncate ${
                                  curMsg.isSuccess ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {curMsg.statusText}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 9. Send Button & Quick Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <button
                                onClick={() => handleSendMessage(call)}
                                disabled={curMsg.isSending || !(curMsg.message || '').trim()}
                                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
                                title="Send Messaging Hub Response"
                              >
                                {curMsg.isSending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                <span>Send</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCallIdForDrawer(call.id);
                                  setIsCallDrawerOpen(true);
                                }}
                                className="text-[10px] text-slate-400 hover:text-white underline transition-colors"
                              >
                                Full Record
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#0c0c0c] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Showing {calls.length} of {totalRecords} call records (Page {page} of {totalPages})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222] text-xs text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222] text-xs text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* 5-Tab Comprehensive Call Record Drawer */}
      <CallHistoryDrawer
        callId={selectedCallIdForDrawer}
        isOpen={isCallDrawerOpen}
        onClose={() => {
          setIsCallDrawerOpen(false);
          setSelectedCallIdForDrawer(null);
        }}
      />

      {/* Cross-Unit Customer History Intelligence Drawer */}
      <CustomerHistoryDrawer
        identifier={selectedCustomerIdentifier}
        isOpen={isCustomerDrawerOpen}
        onClose={() => {
          setIsCustomerDrawerOpen(false);
          setSelectedCustomerIdentifier(null);
        }}
        onLeadTransferred={() => {
          loadCalls();
        }}
      />

      {/* Cross-Unit Lead Transfer Modal */}
      {isTransferModalOpen && leadForTransfer && (
        <CrossUnitTransferModal
          leadId={leadForTransfer.id}
          isOpen={isTransferModalOpen}
          onClose={() => {
            setIsTransferModalOpen(false);
            setLeadForTransfer(null);
          }}
          onSuccess={() => {
            setIsTransferModalOpen(false);
            setLeadForTransfer(null);
            loadCalls();
          }}
          leadName={leadForTransfer.name}
          currentUnitName={leadForTransfer.unit}
        />
      )}
    </div>
  );
}

export default function CallLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070707] flex items-center justify-center text-slate-400">Loading Call Logs...</div>}>
      <CallLogsContent />
    </Suspense>
  );
}

