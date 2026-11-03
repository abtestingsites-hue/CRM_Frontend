"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCallStore } from '@/store/useCallStore';
import { useSocket } from '@/providers/SocketProvider';
import { 
  Phone, PhoneOff, Mic, MicOff, Pause, Play, 
  User, History, FileText, CheckCircle2, ShieldAlert,
  Clock, ArrowRightLeft, Radio, Building, AlertCircle
} from 'lucide-react';
import { CallIntakeFormModal } from './CallIntakeFormModal';
import { CustomerHistoryDrawer } from './CustomerHistoryDrawer';
import { CallTransferModal } from './CallTransferModal';
import { api, apiFetch } from '@/lib/api';

export function GlobalActiveCallWorkspace() {
  const { 
    activeCall, 
    setActiveCall, 
    updateActiveCallStatus,
    isMuted, 
    toggleMute, 
    isHold: isOnHold, 
    toggleHold 
  } = useCallStore();

  const { telephonySocket } = useSocket();

  const [persistedCallSession, setPersistedCallSession] = useState<any | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Authoritative duration timer
  const [durationSeconds, setDurationSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Track customer identity
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);

  const callStatus = activeCall?.status;
  // Determine if active call or post-disconnect documentation workspace should be presented
  const isCallConnected = Boolean(activeCall && (callStatus === 'CONNECTED' || callStatus === 'IN_PROGRESS' || activeCall.accepted));
  const isPostCallDocumentation = Boolean(persistedCallSession && !activeCall);
  const shouldRenderWorkspace = isCallConnected || isPostCallDocumentation;

  // Persist session across disconnection so intake remains open until saved
  useEffect(() => {
    if (activeCall && (activeCall.status === 'CONNECTED' || activeCall.accepted)) {
      setPersistedCallSession({
        callSid: activeCall.callSid || activeCall.roomName || 'active_session',
        customerName: activeCall.customerName,
        phone: activeCall.phone,
        leadId: activeCall.leadId,
        foundation: (activeCall as any).foundation || activeCall.callCategory || activeCall.category || 'UEC',
        startedAt: (activeCall as any).startedAt || new Date().toISOString(),
      });
    }
  }, [activeCall]);

  // Duration timer linked to telephony connection
  useEffect(() => {
    if (isCallConnected) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setDurationSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallConnected]);

  // Fetch caller intelligence & details if missing
  useEffect(() => {
    const rawPhone = activeCall?.phone || persistedCallSession?.phone;
    if (!rawPhone || rawPhone === 'Unknown') return;

    let isMounted = true;
    api
      .get(`/telephony/caller-lookup/${encodeURIComponent(rawPhone.trim())}`)
      .then((res: any) => {
        if (!isMounted) return;
        if (res && res.matchStatus === 'MATCH_FOUND' && res.customer) {
          setCustomerDetails(res.customer);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [activeCall?.phone, persistedCallSession?.phone]);

  if (!shouldRenderWorkspace) {
    return null;
  }

  const effectiveCallSid = activeCall?.callSid || activeCall?.roomName || persistedCallSession?.callSid || 'unknown';
  const effectiveCustomerName = activeCall?.customerName || customerDetails?.name || persistedCallSession?.customerName || 'Customer';
  const effectivePhone = activeCall?.phone || customerDetails?.phone || persistedCallSession?.phone || 'Unknown';
  const effectiveLeadId = activeCall?.leadId || customerDetails?.id || persistedCallSession?.leadId || undefined;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    if (telephonySocket && effectiveCallSid) {
      telephonySocket.emit('disconnectCall', {
        callSid: effectiveCallSid,
        roomName: activeCall?.roomName,
        reason: 'AGENT_DISCONNECT',
      });
    }

    // Move to post-call state: stop WebRTC connection but keep intake workspace active
    updateActiveCallStatus('ENDED');
    setActiveCall(null);
  };

  const handleDocumentationSaved = () => {
    // Clear persisted session to close the workspace cleanly
    setPersistedCallSession(null);
    setCustomerDetails(null);
    setDurationSeconds(0);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#070b10]/95 backdrop-blur-md p-3 sm:p-5 flex flex-col lg:flex-row items-stretch gap-4 sm:gap-6 overflow-hidden animate-in fade-in duration-200">
      {/* ============================================================== */}
      {/* LEFT PANEL — CUSTOMER INTAKE & SERVICE DOCUMENTATION           */}
      {/* ============================================================== */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#0d141c] border border-[#1f2d3d] rounded-2xl shadow-2xl relative">
        <CallIntakeFormModal
          isOpen={true}
          isInlineWorkspace={true}
          callSid={effectiveCallSid}
          customerName={effectiveCustomerName}
          phoneNumber={effectivePhone}
          leadId={effectiveLeadId}
          onClose={() => {
            // Warn or close if finalized
            handleDocumentationSaved();
          }}
          onSuccess={() => {
            handleDocumentationSaved();
          }}
        />
      </div>

      {/* ============================================================== */}
      {/* RIGHT PANEL — ACTIVE CALL WIDGET                               */}
      {/* ============================================================== */}
      <div className="w-full lg:w-[400px] shrink-0 h-full flex flex-col gap-4 overflow-y-auto">
        {/* Call Identity & Status Card */}
        <div className="p-5 rounded-2xl bg-[#0d141c] border border-[#1f2d3d] shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          {/* Top pulse indicator */}
          <div className="w-full flex items-center justify-between text-xs pb-3 border-b border-[#1c2936] mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isCallConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <strong className={`font-mono text-[11px] uppercase tracking-wider ${isCallConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isCallConnected ? 'Call Connected' : 'Call Ended — Documenting'}
              </strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>{formatTimer(durationSeconds)}</span>
            </div>
          </div>

          {/* Caller Avatar & Name */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-blue-500/20 border-2 border-orange-500/40 flex items-center justify-center font-bold text-2xl text-orange-400 shadow-lg mb-3">
            {effectiveCustomerName.charAt(0).toUpperCase() || <User className="w-8 h-8" />}
          </div>

          <h3 className="text-lg font-bold text-white truncate max-w-full">
            {effectiveCustomerName}
          </h3>

          <p className="font-mono text-xs text-slate-300 mt-0.5">
            {effectivePhone}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              {activeCall?.category || persistedCallSession?.foundation || 'UEC Care'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Intake Active</span>
            </span>
          </div>

          {/* Action Triggers: Customer History & Intake Status */}
          <div className="w-full grid grid-cols-2 gap-2 mt-5">
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="py-2 px-3 rounded-xl bg-[#141e28] hover:bg-[#1b2936] border border-[#233342] text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="View customer cross-unit interaction history, previous calls, and notes"
            >
              <History className="w-3.5 h-3.5" />
              <span>Customer History</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              disabled={!isCallConnected}
              className="py-2 px-3 rounded-xl bg-[#141e28] hover:bg-[#1b2936] disabled:opacity-40 disabled:pointer-events-none border border-[#233342] text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Live Call Transfer to another agent or department"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Call</span>
            </button>
          </div>

          {/* Active Call Controls */}
          {isCallConnected ? (
            <div className="w-full pt-4 mt-4 border-t border-[#1c2936] flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={toggleMute}
                className={`p-3 rounded-full border transition-all active:scale-90 ${
                  isMuted
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-[#141e28] hover:bg-[#1b2936] border-[#233342] text-slate-300'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleHold}
                className={`p-3 rounded-full border transition-all active:scale-90 ${
                  isOnHold
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-[#141e28] hover:bg-[#1b2936] border-[#233342] text-slate-300'
                }`}
                title={isOnHold ? 'Resume call' : 'Put call on hold'}
              >
                {isOnHold ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={handleEndCall}
                className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-90"
                title="Disconnect call and complete intake documentation"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-full pt-4 mt-4 border-t border-[#1c2936]">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  The telephony connection has ended. Please finish entering your documentation on the left and click <strong>Save Documentation</strong> to finalize.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Telephony Health & Session Diagnostics */}
        <div className="p-4 rounded-2xl bg-[#0d141c] border border-[#1f2d3d] shadow-xl text-xs space-y-2 text-slate-400">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Session Diagnostics</span>
          <div className="flex items-center justify-between">
            <span>Session ID:</span>
            <span className="font-mono text-slate-300 truncate max-w-[190px]">{effectiveCallSid}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Telephony Status:</span>
            <span className={`font-semibold ${isCallConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isCallConnected ? 'WebRTC Active' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Form Autosave:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Cross-Unit Customer History Intelligence Drawer */}
      <CustomerHistoryDrawer
        identifier={effectivePhone || effectiveLeadId}
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
      />

      {/* Live Call Transfer Modal */}
      {showTransferModal && (
        <CallTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          callSid={effectiveCallSid}
          callerName={effectiveCustomerName}
          callerPhone={effectivePhone}
          onSuccess={() => {
            setShowTransferModal(false);
            handleEndCall();
          }}
        />
      )}
    </div>
  );
}

