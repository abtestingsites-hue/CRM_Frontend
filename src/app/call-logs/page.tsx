"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, Search, Filter, 
  Calendar, Clock, User, Shield, Play, Pause, FileText, 
  RefreshCw, CheckCircle2, AlertTriangle, ArrowUpDown, 
  ChevronLeft, ChevronRight, Share2, Layers, Send, 
  MessageSquare, Mail, Building, Sparkles, Check, AlertCircle,
  PhoneCall, CornerDownRight, Loader2, Volume2, ExternalLink,
  MessageCircle
} from 'lucide-react';
import { api, apiFetch, sanitizeRecordingUrl } from '@/lib/api';
import { useCallStore } from '@/store/useCallStore';
import { CallHistoryDrawer } from '@/components/call-center/CallHistoryDrawer';
import { CustomerHistoryDrawer } from '@/components/call-center/CustomerHistoryDrawer';
import { OmnichannelComposerModal } from '@/components/call-center/OmnichannelComposerModal';
import { SameUnitAgentReassignmentModal } from '@/components/call-center/SameUnitAgentReassignmentModal';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

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

  // Omnichannel Composer state
  const [selectedCallForComposer, setSelectedCallForComposer] = useState<any | null>(null);
  const [composerInitialChannel, setComposerInitialChannel] = useState<string>('WHATSAPP');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  // Same-Unit Agent Reassignment state
  const [leadForReassign, setLeadForReassign] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

  // Active call & Recall Telephony state
  const { activeCall, setActiveCall } = useCallStore();
  const [recallingCallId, setRecallingCallId] = useState<string | null>(null);
  const [recallFeedback, setRecallFeedback] = useState<Record<string, string>>({});

  // Messaging Hub selection state
  const [selectedMessagingHubCallIds, setSelectedMessagingHubCallIds] = useState<Set<string>>(new Set());
  const [batchActionNotice, setBatchActionNotice] = useState<string | null>(null);

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

  // Handle Outbound Recall Call
  const handleRecall = async (call: any) => {
    if (recallingCallId || activeCall) return;
    const phoneToCall = 
      (call.callerPhone && call.callerPhone !== 'Unknown' && call.callerPhone) ||
      (call.customerPhone && call.customerPhone !== 'Unknown' && call.customerPhone) ||
      (call.customerDetails?.phone && call.customerDetails.phone !== 'Unknown' && call.customerDetails.phone) ||
      (call.callerNumber && call.callerNumber !== 'Unknown' && call.callerNumber) ||
      (call.calledNumber && call.calledNumber !== 'Unknown' && call.calledNumber) ||
      (call.customer?.phone && call.customer.phone !== 'Unknown' && call.customer.phone) ||
      (call.lead?.phoneNumber && call.lead.phoneNumber !== 'Unknown' && call.lead.phoneNumber);

    if (!phoneToCall) {
      setRecallFeedback(prev => ({ ...prev, [call.id]: 'No valid phone' }));
      return;
    }

    setRecallingCallId(call.id);
    setRecallFeedback(prev => ({ ...prev, [call.id]: '' }));

    // Normalize phone E.164
    let clean = String(phoneToCall).replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.length === 10) clean = '+91' + clean;
      else if (clean.length === 12 && clean.startsWith('91')) clean = '+' + clean;
      else clean = '+' + clean;
    }

    try {
      let currentAgentId = null;
      try {
        const stored = localStorage.getItem('crm_user');
        if (stored) currentAgentId = JSON.parse(stored).agentId;
      } catch (_) {}

      const res = await apiFetch('/telephony/calls/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clean,
          agentId: currentAgentId,
          contactId: call.customerDetails?.id,
          leadId: call.leadId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setRecallFeedback(prev => ({ ...prev, [call.id]: data.message || 'Recall failed' }));
        setRecallingCallId(null);
        return;
      }

      const finalRoomName = data.roomName || data.callSid || `room_${Date.now()}`;
      setActiveCall({
        callSid: finalRoomName,
        roomName: finalRoomName,
        customerName: call.callerName || data.customerName || 'Customer',
        phone: clean,
        urgency: 'NORMAL',
        category: 'Outbound',
        direction: 'OUTBOUND',
        status: 'DIALING',
        isCaller: true,
        accepted: true,
        token: data.token,
        serverUrl: data.serverUrl || data.wsUrl,
        crossUnitLookup: data.crossUnitLookup,
        customerContext: data.customerContext || (call.customerDetails ? { customer: call.customerDetails } : undefined),
        leadId: call.leadId || data.leadId,
      });
    } catch (e: any) {
      setRecallFeedback(prev => ({ ...prev, [call.id]: 'Network error initiating recall' }));
    } finally {
      setRecallingCallId(null);
    }
  };

  // Messaging Hub selection helpers
  const toggleMessagingHubSelection = (callId: string) => {
    setSelectedMessagingHubCallIds((prev) => {
      const next = new Set(prev);
      if (next.has(callId)) {
        next.delete(callId);
      } else {
        next.add(callId);
      }
      return next;
    });
  };

  const handleSelectAllMessagingHub = () => {
    if (selectedMessagingHubCallIds.size === calls.length) {
      setSelectedMessagingHubCallIds(new Set());
    } else {
      setSelectedMessagingHubCallIds(new Set(calls.map((c) => c.id)));
    }
  };

  const handleBatchMarkFollowup = async () => {
    if (selectedMessagingHubCallIds.size === 0) return;
    setBatchActionNotice(`Queued ${selectedMessagingHubCallIds.size} records for Messaging Hub follow-up`);
    setTimeout(() => setBatchActionNotice(null), 3000);
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

          {/* Batch Action Banner if Messaging Hub items selected */}
          {selectedMessagingHubCallIds.size > 0 && (
            <div className="mb-4 p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs text-white font-semibold">
                  {selectedMessagingHubCallIds.size} record{selectedMessagingHubCallIds.size === 1 ? '' : 's'} selected for Messaging Hub follow-up
                </span>
                {batchActionNotice && (
                  <span className="text-xs text-emerald-400 font-medium ml-2">
                    ✓ {batchActionNotice}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBatchMarkFollowup}
                  className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Mark for Follow-up Queue
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMessagingHubCallIds(new Set())}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* MODULE 2 — CALL LOGS TABLE */}
          <div className="rounded-2xl bg-[#0a0a0a] border border-[#1e1e1e] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1240px]">
                <thead>
                  <tr className="border-b border-[#1c1c1c] bg-[#0e0e0e] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {/* 1. Caller Name */}
                    <th className="py-3 px-3 w-[130px]">Caller Name</th>
                    {/* 2. Handled By */}
                    <th className="py-3 px-3 w-[120px]">Handled By</th>
                    {/* 3. Call Record */}
                    <th className="py-3 px-3 w-[130px]">Call Record</th>
                    {/* 4. Call Summary */}
                    <th className="py-3 px-3 w-[220px]">Call Summary</th>
                    {/* 5. Required Service */}
                    <th className="py-3 px-3 w-[130px]">Required Service</th>
                    {/* 6. Source */}
                    <th className="py-3 px-3 w-[90px]">Source</th>
                    {/* 7. Recall */}
                    <th className="py-3 px-3 w-[100px] text-center">Recall</th>
                    {/* 8. Messaging Hub */}
                    <th className="py-3 px-3 w-[170px] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Msg Hub</span>
                        <input
                          type="checkbox"
                          checked={calls.length > 0 && selectedMessagingHubCallIds.size === calls.length}
                          onChange={handleSelectAllMessagingHub}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-orange-500 cursor-pointer accent-orange-500"
                          title="Select / Unselect All"
                        />
                      </div>
                    </th>
                    {/* 9. Agent Transfer */}
                    <th className="py-3 px-3 w-[110px] text-center">Agent Transfer</th>
                    {/* 10. Actions */}
                    <th className="py-3 px-3 w-[80px] text-right">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#161616] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-20 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                        <span>Loading call records & logs...</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-rose-400">
                        {error}
                      </td>
                    </tr>
                  ) : calls.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-slate-500">
                        No call records match the current filter selection.
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => {
                      const isSummaryExpanded = !!expandedSummaryCallIds[call.id];
                      const isPlaying = playingCallId === call.id;

                      return (
                        <tr
                          key={call.id}
                          className="hover:bg-[#0f0f0f] transition-colors group align-top"
                        >
                          {/* 1. Caller Name (Optimized Width & Truncation) */}
                          <td className="py-3 px-3 w-[130px]">
                            <div className="space-y-0.5">
                              <button
                                onClick={() => {
                                  setSelectedCustomerIdentifier(call.callerPhone || call.leadId || call.id);
                                  setIsCustomerDrawerOpen(true);
                                }}
                                className="font-bold text-white hover:text-orange-400 transition-colors text-left flex items-center gap-1 group/btn w-full"
                                title={`Open details for ${call.callerName}`}
                              >
                                <span className="truncate max-w-[105px] block">{call.callerName}</span>
                                <ExternalLink className="w-3 h-3 text-slate-600 group-hover/btn:text-orange-400 shrink-0" />
                              </button>
                              <p className="text-[11px] text-slate-400 font-mono truncate" title={call.callerPhone}>
                                {call.callerPhone}
                              </p>
                              {call.priority === 'EMERGENCY' && (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-extrabold uppercase animate-pulse">
                                  Emergency
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 block font-mono">
                                {new Date(call.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>

                          {/* 2. Handled By (Optimized Width & Truncation) */}
                          <td className="py-3 px-3 w-[120px]">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-medium text-slate-200" title={call.handlingAgent?.name || 'Unassigned'}>
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate max-w-[95px] block">{call.handlingAgent?.name || 'Unassigned'}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={call.department || 'General'}>
                                <Building className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="truncate max-w-[95px]">{call.department || 'General'}</span>
                              </span>
                              {call.isTransferred && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCallIdForDrawer(call.id);
                                    setIsCallDrawerOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-semibold border border-amber-500/30 transition-all text-left"
                                  title="View transfer details"
                                >
                                  <CornerDownRight className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate max-w-[95px]">
                                    {call.transferredFrom && call.transferredTo 
                                      ? `${call.transferredFrom} ➔ ${call.transferredTo}`
                                      : `Transferred (${call.transferCount})`}
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 3. Call Record */}
                          <td className="py-3 px-3 w-[130px]">
                            <div className="space-y-1">
                              {call.recordingStatus === 'READY' && call.recordingUrl ? (
                                <div className="space-y-1">
                                  <button
                                    onClick={() => togglePlayAudio(call)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
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
                          <td className="py-3 px-3 w-[220px]">
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
                                        Transcript-verified
                                      </span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-[#2a2a2a]">
                                        Metadata
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
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Required Service (Synced with Intake, Clean Fallback) */}
                          <td className="py-3 px-3 w-[130px]">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-semibold ${
                                call.requiredService 
                                  ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {call.requiredService || 'Not Specified'}
                              </span>
                              {call.foundation && (
                                <span className="text-[10px] text-slate-500 block truncate font-medium">
                                  {call.foundation}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 6. Source */}
                          <td className="py-3 px-3 w-[90px]">
                            <span className="inline-block px-2 py-0.5 rounded bg-[#161616] border border-[#262626] text-slate-300 text-[11px] font-medium">
                              {call.source || 'Inbound Call'}
                            </span>
                          </td>

                          {/* 7. Recall Column (Dedicated Outbound Calling) */}
                          <td className="py-3 px-3 w-[100px] text-center">
                            {(() => {
                              const resolvedPhone = 
                                (call.callerPhone && call.callerPhone !== 'Unknown' && call.callerPhone) ||
                                (call.customerPhone && call.customerPhone !== 'Unknown' && call.customerPhone) ||
                                (call.customerDetails?.phone && call.customerDetails.phone !== 'Unknown' && call.customerDetails.phone) ||
                                (call.callerNumber && call.callerNumber !== 'Unknown' && call.callerNumber) ||
                                (call.calledNumber && call.calledNumber !== 'Unknown' && call.calledNumber) ||
                                (call.customer?.phone && call.customer.phone !== 'Unknown' && call.customer.phone) ||
                                (call.lead?.phoneNumber && call.lead.phoneNumber !== 'Unknown' && call.lead.phoneNumber);

                              const canRecall = Boolean(resolvedPhone) && !Boolean(activeCall) && recallingCallId !== call.id;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRecall(call)}
                                    disabled={!canRecall}
                                    className={`px-2.5 py-1.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 mx-auto transition-all shadow-sm ${
                                      recallingCallId === call.id
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                        : canRecall
                                          ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 hover:scale-105 active:scale-95'
                                          : 'bg-[#141414] text-slate-600 border border-[#222] cursor-not-allowed opacity-50'
                                    }`}
                                    title={
                                      activeCall 
                                        ? 'A call is already active' 
                                        : resolvedPhone 
                                          ? `Recall ${resolvedPhone}` 
                                          : 'No valid phone number found'
                                    }
                                  >
                                    {recallingCallId === call.id ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Dialing...</span>
                                      </>
                                    ) : (
                                      <>
                                        <PhoneCall className="w-3.5 h-3.5" />
                                        <span>Recall</span>
                                      </>
                                    )}
                                  </button>
                                  {recallFeedback[call.id] && (
                                    <span className="text-[10px] block mt-1 text-rose-400 font-medium">
                                      {recallFeedback[call.id]}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </td>

                          {/* 8. Messaging Hub Column (Platform Logos + Checkbox) */}
                          <td className="py-3 px-3 w-[170px] text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* WhatsApp */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCallForComposer(call);
                                  setComposerInitialChannel('WHATSAPP');
                                  setIsComposerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#25D366]/20 border border-[#262626] hover:border-[#25D366]/50 text-[#25D366] transition-all hover:scale-110 active:scale-95"
                                title="Send WhatsApp message"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* SMS */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCallForComposer(call);
                                  setComposerInitialChannel('SMS');
                                  setIsComposerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-purple-500/20 border border-[#262626] hover:border-purple-500/50 text-purple-400 transition-all hover:scale-110 active:scale-95"
                                title="Send SMS"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Email */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCallForComposer(call);
                                  setComposerInitialChannel('EMAIL');
                                  setIsComposerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-orange-500/20 border border-[#262626] hover:border-orange-500/50 text-orange-400 transition-all hover:scale-110 active:scale-95"
                                title="Send Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>

                              {/* Instagram */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCallForComposer(call);
                                  setComposerInitialChannel('INSTAGRAM');
                                  setIsComposerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#E4405F]/20 border border-[#262626] hover:border-[#E4405F]/50 text-[#E4405F] transition-all hover:scale-110 active:scale-95"
                                title="Send Instagram message"
                              >
                                <InstagramIcon className="w-3.5 h-3.5" />
                              </button>

                              {/* Checkbox for Bulk Selection */}
                              <input
                                type="checkbox"
                                checked={selectedMessagingHubCallIds.has(call.id)}
                                onChange={() => toggleMessagingHubSelection(call.id)}
                                className="w-3.5 h-3.5 ml-1 rounded border-slate-700 bg-slate-900 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-orange-500"
                                title="Mark for Messaging Hub follow-up"
                              />
                            </div>
                          </td>

                          {/* 9. Agent Transfer Column (Dedicated Reassignment Modal) */}
                          <td className="py-3 px-3 w-[110px] text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setLeadForReassign({
                                  id: call.leadId || call.id,
                                  name: call.callerName || 'Lead Record',
                                  unit: call.department || 'UEC',
                                });
                                setIsReassignModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5 mx-auto transition-all hover:scale-105 active:scale-95"
                              title="Transfer lead to an agent in the same unit"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Transfer</span>
                            </button>
                          </td>

                          {/* 10. Actions / Drawers */}
                          <td className="py-3 px-3 w-[80px] text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedCallIdForDrawer(call.id);
                                  setIsCallDrawerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] text-slate-400 hover:text-white border border-[#262626] transition-colors"
                                title="View Call Details & Handover Chain"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCustomerIdentifier(call.callerPhone || call.leadId || call.id);
                                  setIsCustomerDrawerOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#202020] text-slate-400 hover:text-white border border-[#262626] transition-colors"
                                title="View Customer Intelligence"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
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

      {/* Omnichannel Composer Modal */}
      {isComposerOpen && selectedCallForComposer && (
        <OmnichannelComposerModal
          isOpen={isComposerOpen}
          onClose={() => {
            setIsComposerOpen(false);
            setSelectedCallForComposer(null);
          }}
          call={selectedCallForComposer}
          initialChannel={composerInitialChannel}
          onMessageSent={() => {
            loadCalls();
          }}
        />
      )}

      {/* Same-Unit Agent Reassignment Modal */}
      {isReassignModalOpen && leadForReassign && (
        <SameUnitAgentReassignmentModal
          leadId={leadForReassign.id}
          isOpen={isReassignModalOpen}
          onClose={() => {
            setIsReassignModalOpen(false);
            setLeadForReassign(null);
          }}
          onSuccess={() => {
            setIsReassignModalOpen(false);
            setLeadForReassign(null);
            loadCalls();
          }}
          leadName={leadForReassign.name}
          currentUnitName={leadForReassign.unit}
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

