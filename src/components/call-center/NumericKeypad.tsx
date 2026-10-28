"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Phone, PhoneCall, Delete, X, AlertCircle, Volume2, ShieldCheck, Check } from 'lucide-react';
import { useCallStore } from '@/store/useCallStore';
import { useAuthStore } from '@/store/authStore';
import { apiFetch } from '@/lib/api';

interface NumericKeypadProps {
  onCallInitiated?: (data: any) => void;
}

export function NumericKeypad({ onCallInitiated }: NumericKeypadProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDialing, setIsDialing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const { activeCall, setActiveCall } = useCallStore();

  const keypadButtons = [
    { key: '1', sub: ' ' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
    { key: '*', sub: ' ' },
    { key: '0', sub: '+' },
    { key: '#', sub: ' ' },
  ];

  // DTMF Audio Feedback
  const playDtmfTone = useCallback((key: string) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freqMap: Record<string, number> = {
        '1': 697, '2': 697, '3': 697,
        '4': 770, '5': 770, '6': 770,
        '7': 852, '8': 852, '9': 852,
        '*': 941, '0': 941, '#': 941,
      };

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqMap[key] || 700, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  }, []);

  const handleKeyPress = (key: string) => {
    setErrorMessage(null);
    playDtmfTone(key);
    setPhoneNumber(prev => prev + key);
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMessage(null);
    setPhoneNumber('');
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in another input element
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'INPUT' && activeEl.id !== 'dialpad-input') {
        return;
      }
      if (activeEl && activeEl.tagName === 'TEXTAREA') {
        return;
      }

      if (/^[0-9*#]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === '+') {
        setPhoneNumber(prev => prev + '+');
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitiateCall();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phoneNumber, isDialing, activeCall]);

  // E.164 normalization
  const normalizePhoneNumber = (raw: string): string => {
    let cleaned = raw.replace(/[^\d+*#]/g, '');
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    } else if (cleaned.length === 10 && !cleaned.startsWith('+')) {
      // Default standard 10 digit to Indian E.164
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+') && cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const isValidNumber = (num: string): boolean => {
    const cleaned = num.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleInitiateCall = async () => {
    if (isDialing) return;
    if (activeCall) {
      setErrorMessage('A call is already active. Please conclude the current call first.');
      return;
    }

    const normalized = normalizePhoneNumber(phoneNumber);
    if (!isValidNumber(normalized)) {
      setErrorMessage('Please enter a valid 10-15 digit phone number.');
      return;
    }

    setIsDialing(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      let currentAgentId = null;
      try {
        const authUser = useAuthStore.getState().user;
        if (authUser?.agentId || authUser?.id) {
          currentAgentId = authUser.agentId || authUser.id;
        }
        const stored = localStorage.getItem('crm_user');
        if (!currentAgentId && stored) {
          currentAgentId = JSON.parse(stored).agentId;
        }
      } catch (_) {}

      const res = await apiFetch('/telephony/calls/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: normalized,
          agentId: currentAgentId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || data.message || 'Call initiation failed. Please verify provider connectivity.');
        setIsDialing(false);
        return;
      }

      setSuccessNotice(`Connecting outbound call to ${normalized}...`);

      const finalRoomName = data.roomName || data.callSid || `room_${Date.now()}`;
      const resolvedName = data.customerName && data.customerName !== 'Customer' ? data.customerName : 'Customer';

      setActiveCall({
        callSid: finalRoomName,
        roomName: finalRoomName,
        customerName: resolvedName,
        phone: normalized,
        urgency: 'NORMAL',
        category: 'Outbound',
        direction: 'OUTBOUND',
        status: 'DIALING',
        isCaller: true,
        accepted: true,
        token: data.token,
        serverUrl: data.serverUrl || data.wsUrl,
        crossUnitLookup: data.crossUnitLookup,
        customerContext: data.customerContext || (data.crossUnitLookup?.matchingCustomer ? { customer: data.crossUnitLookup.matchingCustomer } : undefined),
        leadId: data.leadId,
      });

      // Real-time lookup fallback if backend didn't attach customerName
      if (resolvedName === 'Customer') {
        apiFetch(`/api/v1/telephony/caller-lookup/${encodeURIComponent(normalized)}`)
          .then(async (lookupRes) => {
            if (lookupRes.ok) {
              const lookupData = await lookupRes.json();
              if (lookupData && lookupData.name) {
                const current = useCallStore.getState().activeCall;
                if (current && (current.callSid === finalRoomName || current.roomName === finalRoomName)) {
                  setActiveCall({
                    ...current,
                    customerName: lookupData.name,
                    crossUnitLookup: lookupData,
                    customerContext: { customer: lookupData.matchingCustomer, lead: lookupData.matchingLead },
                    leadId: lookupData.matchingLead?.id || current.leadId,
                  });
                }
              }
            }
          })
          .catch(() => {});
      }

      if (onCallInitiated) {
        onCallInitiated(data);
      }
    } catch (err: any) {
      console.error('[NumericKeypad] Outbound call error:', err);
      setErrorMessage('Network error while connecting call to provider.');
    } finally {
      setIsDialing(false);
    }
  };

  const isCallDisabled = isDialing || !isValidNumber(phoneNumber) || !!activeCall;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto p-4 select-none">
      {/* Display Screen */}
      <div className="w-full bg-[#0a0a0a] border border-[#222] rounded-2xl p-4 mb-5 shadow-inner">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> WebRTC Secure Dialer
          </span>
          {activeCall ? (
            <span className="text-amber-400 font-bold animate-pulse">Call In Progress</span>
          ) : (
            <span className="text-slate-400">Ready</span>
          )}
        </div>

        <div className="relative flex items-center justify-between">
          <input
            id="dialpad-input"
            type="text"
            value={phoneNumber}
            onChange={(e) => {
              setErrorMessage(null);
              setPhoneNumber(e.target.value);
            }}
            placeholder="Enter phone number..."
            className="w-full bg-transparent text-2xl font-mono font-bold text-white tracking-widest outline-none pr-14 placeholder:text-slate-600 placeholder:text-base"
          />
          {phoneNumber && (
            <div className="flex items-center gap-1 absolute right-0">
              <button
                type="button"
                onClick={handleBackspace}
                aria-label="Backspace"
                title="Backspace"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
              >
                <Delete className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear number"
                title="Clear number"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#222] rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* E.164 Formatted Preview */}
        {phoneNumber && isValidNumber(phoneNumber) && (
          <div className="text-[11px] text-emerald-400 font-mono mt-1">
            Normalized: {normalizePhoneNumber(phoneNumber)}
          </div>
        )}

        {/* Error / Feedback Notice */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}
      </div>

      {/* 3x4 Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {keypadButtons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => handleKeyPress(btn.key)}
            className="group flex flex-col items-center justify-center h-16 bg-[#111] hover:bg-[#1a1a1a] active:bg-primary/20 border border-[#222] hover:border-[#333] active:border-primary/40 rounded-2xl transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <span className="text-xl font-bold text-white group-hover:text-primary transition-colors">
              {btn.key}
            </span>
            <span className="text-[10px] text-slate-500 tracking-widest font-mono group-hover:text-slate-400">
              {btn.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Action Buttons: Dial Button */}
      <button
        type="button"
        onClick={handleInitiateCall}
        disabled={isCallDisabled}
        className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-base shadow-lg ${
          isCallDisabled
            ? 'bg-[#181818] text-slate-600 border border-[#222] cursor-not-allowed shadow-none'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:scale-98 animate-pulse hover:animate-none'
        }`}
      >
        <PhoneCall className={`w-5 h-5 ${isDialing ? 'animate-bounce' : ''}`} />
        <span>
          {isDialing ? 'Dialing...' : activeCall ? 'Call Active' : 'Start Outbound Call'}
        </span>
      </button>

      <p className="text-[11px] text-slate-500 mt-3 text-center">
        Press keys or type on your keyboard. Press Enter to dial.
      </p>
    </div>
  );
}
