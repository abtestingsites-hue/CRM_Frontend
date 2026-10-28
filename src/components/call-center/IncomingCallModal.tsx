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
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
        >
          {incomingCall.emergencyFlag && (
            <div className="bg-red-500 text-white p-2 text-center text-sm font-bold animate-pulse flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              EMERGENCY CALL
            </div>
          )}
          
          <div className="p-5">
            {/* Header: Name, Phone, Ringing Indicator */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  {lookupResult?.name || incomingCall.customerContext?.customer?.name || incomingCall.customerName || 'Unknown Caller'}
                </h3>
                <p className="text-slate-500 font-mono text-sm mt-0.5">{incomingCall.phone}</p>
                {incomingCall.originalCallerId && incomingCall.originalCallerId !== incomingCall.phone && (
                  <p className="text-[11px] text-slate-400 font-mono">Original Caller ID: {incomingCall.originalCallerId}</p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  incomingCall.customerContext?.priority === 'High' || incomingCall.emergencyFlag ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                }`}>
                  {incomingCall.customerContext?.priority || incomingCall.category || 'Inbound'}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                  Ringing...
                </span>
              </div>
            </div>

            {/* Source Attribution Bar */}
            <div className="mb-3 flex items-center gap-2">
              {getSourceBadge()}
              {incomingCall.trackingNumber && (
                <span className="text-[10px] text-slate-400 font-mono">
                  DID: {incomingCall.trackingNumber}
                </span>
              )}
            </div>

            {/* Transferred Call Indicator */}
            {incomingCall.isTransfer && (
              <div className="mb-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <PhoneForwarded className="w-3.5 h-3.5" />
                    Incoming Transferred Call
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Transferred by: <strong className="text-amber-400">{incomingCall.sourceAgent?.name || 'Agent'}</strong> ({incomingCall.sourceAgent?.department || 'Care'})
                  </p>
                  {incomingCall.transferReason && (
                    <p className="text-[11px] text-slate-400 italic">"{incomingCall.transferReason}"</p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase border border-amber-500/40">
                  {incomingCall.transferMode || 'Blind'}
                </span>
              </div>
            )}

            {/* Cross-Unit Caller Intelligence Section */}
            <div className="mb-4">
              {lookupStatus === 'PENDING' && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shrink-0" />
                  <span>Searching caller across UEC, UNCF, Ambulance, & all units...</span>
                </div>
              )}

              {lookupStatus === 'MATCH_FOUND' && lookupResult && (
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-400" /> Caller Intelligence
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      [{lookupResult.businessUnit || 'UEC'}] {lookupResult.department || ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Open Lead:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {lookupResult.openLeadStatus || (lookupResult.matchingLead ? 'Active Lead' : 'None')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Previous Calls:</span>
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                        <History className="w-3 h-3 text-slate-400" />
                        {lookupResult.previousCallsCount ?? 0}
                      </span>
                    </div>
                  </div>

                  {lookupResult.lastContactDate && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      Last Contact: <span className="text-slate-300 font-medium">{new Date(lookupResult.lastContactDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {lookupResult.notes && (
                    <p className="text-[11px] text-slate-300 italic bg-black/20 p-1.5 rounded border border-white/5 line-clamp-2">
                      "{lookupResult.notes}"
                    </p>
                  )}
                </div>
              )}

              {lookupStatus === 'MULTIPLE_MATCHES' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Multiple Records Found Across Units
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Matches exist across multiple business units. Records are preserved separately.
                  </p>
                  {lookupResult?.matches && lookupResult.matches.length > 0 && (
                    <div className="space-y-1 pt-1 max-h-24 overflow-y-auto custom-scrollbar">
                      {lookupResult.matches.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-black/20 px-2 py-1 rounded">
                          <span className="font-bold text-blue-400">[{m.unit || 'Unit'}]</span>
                          <span className="text-slate-300 truncate max-w-[150px]">{m.name || m.title || 'Record'}</span>
                          <span className="text-slate-500 uppercase">{m.type || 'Contact'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {lookupStatus === 'NO_HISTORY' && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-medium">No previous history found — new contact.</span>
                </div>
              )}

              {lookupStatus === 'LOOKUP_FAILED' && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="font-medium">Caller history temporarily unavailable.</span>
                </div>
              )}
            </div>

            {incomingCall.transcript && (
              <div className="mb-4 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">AI Live Transcript</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{incomingCall.transcript}"</p>
              </div>
            )}

            {/* Answer and Reject Controls */}
            <div className="flex gap-3">
              <button 
                onClick={handleReject}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 hover:text-red-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all flex justify-center items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                Reject
              </button>
              
              <button 
                onClick={handleAccept}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-500/30 flex justify-center items-center gap-2"
              >
                <Phone className="w-4 h-4 animate-bounce" />
                Answer
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

