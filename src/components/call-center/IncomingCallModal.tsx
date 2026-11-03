"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useCallStore } from '@/store/useCallStore';
import { useSocket } from '@/providers/SocketProvider';
import { useAuthStore } from '@/store/authStore';
import { Phone, PhoneOff, AlertTriangle, User, Clock, PhoneForwarded, Building2, History, ShieldCheck, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';

export const IncomingCallModal = () => {
  const { incomingCall, setIncomingCall, setActiveCall, setStatus } = useCallStore();
  const { telephonySocket, mediaSocket } = useSocket();
  const { user } = useAuthStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cross-unit lookup state
  const [lookupStatus, setLookupStatus] = useState<'PENDING' | 'MATCH_FOUND' | 'NO_HISTORY' | 'MULTIPLE_MATCHES' | 'LOOKUP_FAILED'>('PENDING');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const activeCallSidRef = useRef<string | null>(null);

  useEffect(() => {
    if (incomingCall) {
      // Outbound calls must never display the incoming call prompt
      const isOutbound =
        (incomingCall.direction && incomingCall.direction.toUpperCase() === 'OUTBOUND') ||
        (incomingCall.category && incomingCall.category.toLowerCase() === 'outbound') ||
        (incomingCall.roomName && incomingCall.roomName.startsWith('call_outbound_')) ||
        (incomingCall.callSid && incomingCall.callSid.startsWith('call_outbound_')) ||
        incomingCall.isCaller;

      if (isOutbound) {
        console.log('[IncomingCallModal] Clearing outbound call from incoming modal');
        setIncomingCall(null);
        return;
      }

      activeCallSidRef.current = incomingCall.callSid || incomingCall.roomName || null;

      // Initialize audio ringtone
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/ringtone.mp3');
        audioRef.current.loop = true;
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
            console.error('Audio play failed:', e);
          }
        });
      }

      // 1. Initial seed from gateway if provided
      if (incomingCall.crossUnitLookup) {
        setLookupResult(incomingCall.crossUnitLookup);
        setLookupStatus(incomingCall.crossUnitLookup.matchStatus || 'MATCH_FOUND');
      } else {
        setLookupStatus('PENDING');
        setLookupResult(null);
      }

      // 2. Client-side caller lookup for fresh cross-unit intelligence
      const callerNumber = incomingCall.phone || incomingCall.caller || (incomingCall as any).from;
      if (callerNumber && callerNumber !== 'Unknown') {
        const sid = activeCallSidRef.current;
        apiFetch(`/api/v1/telephony/caller-lookup/${encodeURIComponent(callerNumber)}`)
          .then(async (res) => {
            if (activeCallSidRef.current !== sid) return; // Stale call
            if (res.ok) {
              const data = await res.json();
              if (activeCallSidRef.current === sid) {
                setLookupResult(data);
                setLookupStatus(data.matchStatus || 'MATCH_FOUND');
              }
            } else {
              if (activeCallSidRef.current === sid && !incomingCall.crossUnitLookup) {
                setLookupStatus('LOOKUP_FAILED');
              }
            }
          })
          .catch((err) => {
            console.warn('[IncomingCallModal] Cross-unit lookup error:', err);
            if (activeCallSidRef.current === sid && !incomingCall.crossUnitLookup) {
              setLookupStatus('LOOKUP_FAILED');
            }
          });
      }
    } else {
      activeCallSidRef.current = null;
      setLookupResult(null);
      setLookupStatus('PENDING');
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    
    const activeUserId = user?.agentId || user?.id;

    // Notify backend that we accepted
    if (incomingCall.category === 'Internal' && mediaSocket) {
      mediaSocket.emit('acceptCall', { 
        callSid: incomingCall.callSid,
        roomName: incomingCall.roomName,
        agentId: activeUserId,
      });
    } else if (telephonySocket) {
      telephonySocket.emit('acceptCall', { 
        callSid: incomingCall.callSid,
        roomName: incomingCall.roomName,
        agentId: activeUserId,
      });
    }
    
    setActiveCall({
      ...incomingCall,
      duration: 0,
      accepted: true,
      crossUnitLookup: lookupResult,
      customerName: lookupResult?.name || incomingCall.customerName || incomingCall.customerContext?.customer?.name,
    });
    setIncomingCall(null);
    setStatus('BUSY');
  };

  const handleReject = () => {
    if (!incomingCall) return;
    
    if (incomingCall.category === 'Internal' && mediaSocket) {
      mediaSocket.emit('rejectCall', { callSid: incomingCall.callSid });
    } else if (telephonySocket) {
      telephonySocket.emit('rejectCall', { callSid: incomingCall.callSid });
    }
    setIncomingCall(null);
  };

  const getSourceBadge = () => {
    const sourceType = incomingCall?.sourceType || 'UNKNOWN';
    if (sourceType === 'VERIFIED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Verified Source: {incomingCall?.campaign || incomingCall?.source || 'Campaign'}
        </span>
      );
    }
    if (sourceType === 'INFERRED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Inferred: Primary Trunk (+918064267760)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
        <HelpCircle className="w-3 h-3" />
        Unknown Source
      </span>
    );
  };

  const isOutbound =
    incomingCall &&
    ((incomingCall.direction && incomingCall.direction.toUpperCase() === 'OUTBOUND') ||
      (incomingCall.category && incomingCall.category.toLowerCase() === 'outbound') ||
      (incomingCall.roomName && incomingCall.roomName.startsWith('call_outbound_')) ||
      (incomingCall.callSid && incomingCall.callSid.startsWith('call_outbound_')) ||
      incomingCall.isCaller);

  return (
    <AnimatePresence>
      {incomingCall && !isOutbound && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 bg-[#06090e]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto"
        >
          <div className="w-full max-w-4xl bg-[#0c1219] border border-[#1e2a38] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {incomingCall.emergencyFlag && (
              <div className="bg-rose-600 text-white p-3 text-center text-sm font-bold animate-pulse flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>CRITICAL EMERGENCY INCOMING CALL — IMMEDIATE RESPONSE REQUIRED</span>
              </div>
            )}
            
            {/* Top Bar: Inbound Call & Source Attribution */}
            <div className="p-4 px-6 border-b border-[#1a2533] bg-[#0e1622] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="font-bold text-white text-sm tracking-wide">
                  INCOMING TELEPHONY CALL
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {incomingCall.customerContext?.priority || incomingCall.category || 'Inbound PSTN'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {getSourceBadge()}
                {incomingCall.trackingNumber && (
                  <span className="text-[11px] text-slate-400 font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    DID: {incomingCall.trackingNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Main Content: Split Intelligence & Call Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8">
              {/* Left Column (7 cols): Cross-Unit Customer Intelligence */}
              <div className="lg:col-span-7 space-y-4">
                {/* Caller Identification */}
                <div className="p-4 rounded-2xl bg-[#121c27] border border-[#203144] space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-0.5">
                        Caller Identification
                      </span>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <User className="w-6 h-6 text-orange-400" />
                        {lookupResult?.name || incomingCall.customerContext?.customer?.name || incomingCall.customerName || 'Customer / Inquirer'}
                      </h2>
                    </div>
                  </div>

                  <p className="text-lg text-emerald-400 font-mono font-semibold">
                    {incomingCall.phone}
                  </p>
                  {incomingCall.originalCallerId && incomingCall.originalCallerId !== incomingCall.phone && (
                    <p className="text-xs text-slate-400 font-mono">
                      Original Caller ID: {incomingCall.originalCallerId}
                    </p>
                  )}
                </div>

                {/* Transferred Call Indicator */}
                {incomingCall.isTransfer && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                        <PhoneForwarded className="w-4 h-4" />
                        Incoming Handover / Transferred Call
                      </div>
                      <p className="font-semibold text-slate-200">
                        Transferred by: <strong className="text-amber-400">{incomingCall.sourceAgent?.name || 'Agent'}</strong> ({incomingCall.sourceAgent?.department || 'Care'})
                      </p>
                      {incomingCall.transferReason && (
                        <p className="text-xs text-slate-300 italic">"{incomingCall.transferReason}"</p>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase border border-amber-500/40">
                      {incomingCall.transferMode || 'Blind'}
                    </span>
                  </div>
                )}

                {/* Cross-Unit Caller Intelligence */}
                <div className="p-4 rounded-2xl bg-[#121c27] border border-[#203144] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-orange-400" /> Cross-Unit CRM Records
                    </span>
                    {lookupResult?.businessUnit && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        [{lookupResult.businessUnit}] {lookupResult.department || ''}
                      </span>
                    )}
                  </div>

                  {lookupStatus === 'PENDING' && (
                    <div className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin shrink-0" />
                      <span>Verifying caller across UEC, UNCF, ACare, Ambulance, & all units...</span>
                    </div>
                  )}

                  {lookupStatus === 'MATCH_FOUND' && lookupResult && (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Open Lead Status:</span>
                          <span className="font-semibold text-white">
                            {lookupResult.openLeadStatus || (lookupResult.matchingLead ? 'Active Lead' : 'None')}
                          </span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Previous Calls:</span>
                          <span className="font-semibold text-white flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-orange-400" />
                            {lookupResult.previousCallsCount ?? 0}
                          </span>
                        </div>
                      </div>

                      {lookupResult.lastContactDate && (
                        <div className="text-xs text-slate-400 pt-1">
                          Last Contact: <span className="text-slate-200 font-semibold">{new Date(lookupResult.lastContactDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      {lookupResult.notes && (
                        <p className="text-xs text-slate-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5 line-clamp-3">
                          "{lookupResult.notes}"
                        </p>
                      )}
                    </div>
                  )}

                  {lookupStatus === 'MULTIPLE_MATCHES' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Multiple Records Across Business Units
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Matches exist across multiple units. Records are preserved separately.
                      </p>
                      {lookupResult?.matches && (
                        <div className="space-y-1 pt-1 max-h-24 overflow-y-auto custom-scrollbar">
                          {lookupResult.matches.map((m: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-[11px] bg-black/40 px-2 py-1 rounded">
                              <span className="font-bold text-blue-400">[{m.unit || 'Unit'}]</span>
                              <span className="text-slate-200 truncate">{m.name || 'Record'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {lookupStatus === 'NO_HISTORY' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="font-medium">No previous history found — new caller contact.</span>
                    </div>
                  )}

                  {lookupStatus === 'LOOKUP_FAILED' && (
                    <div className="bg-slate-800/60 border border-slate-700 p-2.5 rounded-xl text-xs text-slate-400">
                      Caller history temporarily unavailable.
                    </div>
                  )}
                </div>

                {incomingCall.transcript && (
                  <div className="bg-[#121c27] border border-[#203144] p-3 rounded-2xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">AI Live Transcript</p>
                    <p className="text-xs text-slate-300 italic">"{incomingCall.transcript}"</p>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Ringing Radar & High-Visibility Actions */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#0f1722] rounded-2xl border border-[#1b2736] space-y-6 text-center">
                {/* Ringing Pulse Radar */}
                <div className="relative flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-emerald-500/20 animate-ping absolute"></div>
                  <div className="w-24 h-24 rounded-full bg-emerald-500/30 animate-pulse absolute"></div>
                  <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-900/50 relative z-10">
                    <Phone className="w-9 h-9 animate-bounce" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    Incoming Call Ringing...
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Answering will connect the WebRTC audio session and immediately open the Customer Intake Documentation screen.
                  </p>
                </div>

                {/* Answer and Reject Controls */}
                <div className="w-full space-y-3 pt-2">
                  <button 
                    onClick={handleAccept}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-base transition-all shadow-xl shadow-emerald-900/40 flex justify-center items-center gap-3 active:scale-95"
                  >
                    <Phone className="w-5 h-5 animate-bounce" />
                    <span>Answer & Open Intake</span>
                  </button>

                  <button 
                    onClick={handleReject}
                    className="w-full py-3 bg-[#182330] hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-[#26374a] rounded-2xl font-semibold text-xs transition-all flex justify-center items-center gap-2 active:scale-95"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Decline / Reject Call</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

