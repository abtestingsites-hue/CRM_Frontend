"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Phone, PhoneIncoming, PhoneOutgoing, Clock, User, Shield, 
  FileText, Play, Pause, Volume2, Calendar, CheckCircle2, 
  AlertTriangle, ArrowRight, Activity, RotateCcw, Sparkles, Building,
  PhoneForwarded, CornerDownRight
} from 'lucide-react';
import { api } from '@/lib/api';

interface CallHistoryDrawerProps {
  callId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CallHistoryDrawer({ callId, isOpen, onClose }: CallHistoryDrawerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'recording' | 'summary' | 'notes' | 'timeline'>('overview');

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (!isOpen || !callId) {
      setData(null);
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api.get(`/telephony/call-history/${callId}`)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load call details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [callId, isOpen]);

  // Audio event listeners
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Audio play error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!audioDuration && audioRef.current.duration) {
        setAudioDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0a0a0a] border-l border-[#1f1f1f] h-full flex flex-col text-white shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1e1e1e] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
              <Phone className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">Call Record Details</h2>
                {data?.overview?.direction && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    data.overview.direction === 'INBOUND'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  }`}>
                    {data.overview.direction}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                ID: {callId?.slice(0, 18)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1a1a1a] bg-[#0c0c0c] px-4 overflow-x-auto custom-scrollbar">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'recording', label: 'Audio Playback' },
            { id: 'summary', label: 'AI Summary' },
            { id: 'notes', label: 'Notes & Intake' },
            { id: 'timeline', label: 'Audit Timeline' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {loading && (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400">Loading call record details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Status</span>
                      <div className="text-sm font-bold text-white mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold ${
                          data.overview.status === 'CONNECTED' || data.overview.status === 'ENDED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : data.overview.status === 'MISSED'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : data.overview.status === 'TRANSFERRED'
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}>
                          {data.overview.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Duration</span>
                      <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(data.overview.duration)}
                      </div>
                    </div>
                    <div className="p-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Department</span>
                      <div className="text-sm font-bold text-white mt-1 truncate">
                        {data.overview.handlingAgent?.department || 'General Care'}
                      </div>
                    </div>
                    <div className="p-3 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Transfers</span>
                      <div className="text-sm font-bold text-white mt-1">
                        {data.overview.transfers?.length || 0} Transfers
                      </div>
                    </div>
                  </div>

                  {/* Caller & Agent Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-semibold">
                        <User className="w-3.5 h-3.5 text-orange-400" /> Caller / Contact
                      </div>
                      <h4 className="text-base font-bold text-white">{data.overview.caller?.name || 'Unknown'}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{data.overview.caller?.phone || 'No phone'}</p>
                      {data.overview.lead && (
                        <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Associated Lead</span>
                          <p className="text-xs font-semibold text-orange-400 truncate">{data.overview.lead.name}</p>
                          <span className="text-[10px] text-slate-400">{data.overview.lead.primaryService || data.overview.lead.foundation || 'General Service'}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-[#111] border border-[#1e1e1e] rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-semibold">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" /> Handling Agent
                      </div>
                      <h4 className="text-base font-bold text-white">{data.overview.handlingAgent?.name || 'Care Coordinator'}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{data.overview.handlingAgent?.department || 'Support Desk'}</p>
                      <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Provider Session</span>
                        <p className="text-xs text-slate-400 font-mono truncate">{data.overview.providerCallId || 'LiveKit'}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">Room: {data.overview.livekitRoom || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Call Transfer Transmission & Custody Chain Card */}
                  {((data.overview.transfers && data.overview.transfers.length > 0) || 
                    (data.overview.transferHistory?.transfers && data.overview.transferHistory.transfers.length > 0) ||
                    data.overview.transferredFrom) && (
                    <div className="p-4 bg-gradient-to-r from-amber-500/10 via-[#13171a] to-cyan-500/10 border border-amber-500/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                            <PhoneForwarded className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              Call Transfer & Transmission Chain
                            </h4>
                            <p className="text-[11px] text-slate-400">Audio handover & agent custody log</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {data.overview.transfers?.length || data.overview.transferHistory?.transfers?.length || 1} Transfer(s)
                        </span>
                      </div>

                      {/* Summary Banner */}
                      <div className="p-3 bg-[#0a0f12] border border-cyan-500/20 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-slate-200">
                            {data.overview.transferredFrom || data.overview.transfers?.[0]?.initiatingAgent?.name || data.overview.transferHistory?.lastTransferredFrom || 'Origin Agent'}
                          </span>
                          <span className="text-amber-400 font-bold">➔</span>
                          <span className="font-bold text-emerald-400">
                            {data.overview.transferredTo || data.overview.transfers?.[0]?.destinationAgent?.name || data.overview.transferHistory?.lastTransferredTo || data.overview.handlingAgent?.name || 'Transmitting Agent'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Audio Transmitted
                        </span>
                      </div>

                      {/* Detailed Audit Legs */}
                      <div className="space-y-2 mt-2">
                        {(data.overview.transfers || data.overview.transferHistory?.transfers || []).map((tr: any, idx: number) => {
                          const fromName = tr.initiatingAgent?.name || tr.fromAgentName || tr.metadata?.transferredFrom || data.overview.transferredFrom || 'Agent';
                          const fromDept = tr.initiatingAgent?.department || tr.sourceDepartment || tr.fromDepartment || 'Care';
                          const toName = tr.destinationAgent?.name || tr.toAgentName || tr.metadata?.transferredTo || data.overview.transferredTo || 'Destination Agent';
                          const toDept = tr.destinationAgent?.department || tr.destDepartment || tr.toDepartment || 'Specialist';
                          const mode = tr.transferMode || 'BLIND';
                          const status = tr.status || 'COMPLETED';
                          const time = tr.completedAt || tr.transferredAt || tr.initiatedAt || tr.createdAt;
                          const reason = tr.reason || tr.metadata?.reason || 'Shift call to coordinator';

                          return (
                            <div key={tr.id || idx} className="p-3 bg-[#111] border border-[#222] rounded-lg space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                                  <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
                                  Leg {idx + 1}: <strong className="text-white">{fromName}</strong> ({fromDept}) ➔ <strong className="text-emerald-300">{toName}</strong> ({toDept})
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  status === 'COMPLETED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}>
                                  {status} • {mode}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#1a1a1a]">
                                <span className="italic">Reason: {reason}</span>
                                {time && (
                                  <span className="font-mono text-slate-500">{new Date(time).toLocaleTimeString()}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Timestamps Card */}
                  <div className="p-4 bg-[#111] border border-[#1e1e1e] rounded-xl">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Time Breakdown</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Initiated At</span>
                        <span className="font-mono text-slate-200">{new Date(data.overview.startedAt).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ended At</span>
                        <span className="font-mono text-slate-200">
                          {data.overview.endedAt ? new Date(data.overview.endedAt).toLocaleString() : 'In Progress / Ringing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RECORDING & AUDIO PLAYBACK */}
              {activeTab === 'recording' && (
                <div className="space-y-6">
                  <div className="p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-orange-400" />
                        <h3 className="font-bold text-sm text-white">Call Audio Recording</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        data.recording.status === 'READY'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : data.recording.status === 'PROCESSING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {data.recording.status}
                      </span>
                    </div>

                    {data.recording.status === 'READY' && data.recording.url ? (
                      <div>
                        <audio
                          ref={audioRef}
                          src={data.recording.url}
                          onTimeUpdate={handleTimeUpdate}
                          onEnded={() => setIsPlaying(false)}
                          preload="metadata"
                        />
                        {/* Playback Progress */}
                        <div className="space-y-2 mb-4">
                          <input
                            type="range"
                            min="0"
                            max={audioDuration || data.recording.duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full accent-orange-500 h-1.5 bg-[#222] rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[11px] font-mono text-slate-400">
                            <span>{formatDuration(currentTime)}</span>
                            <span>{formatDuration(audioDuration || data.recording.duration)}</span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={togglePlay}
                              className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                            >
                              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            <span className="text-xs font-semibold text-slate-300 ml-2">
                              {isPlaying ? 'Playing Audio' : 'Click to Play'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-xl border border-[#2a2a2a]">
                            {[1, 1.25, 1.5].map((speed) => (
                              <button
                                key={speed}
                                onClick={() => changeSpeed(speed)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                  playbackSpeed === speed
                                    ? 'bg-orange-500 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-75" />
                        <h4 className="text-sm font-bold text-white">Recording Unavailable</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          {data.recording.failureReason || 'Recording was not generated or has reached retention limits for this call session.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AI CALL SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  <div className="p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h3 className="font-bold text-sm text-white">AI Call Intelligence</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        data.aiSummary.isTranscriptDerived
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {data.aiSummary.isTranscriptDerived ? 'Verified Transcript' : 'Metadata Fallback'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[#161616] rounded-xl border border-[#222]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Sentiment</span>
                        <p className="text-xs font-bold text-white mt-0.5">{data.aiSummary.sentiment || 'NEUTRAL'}</p>
                      </div>
                      <div className="p-3 bg-[#161616] rounded-xl border border-[#222]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Risk Level</span>
                        <p className="text-xs font-bold text-white mt-0.5">{data.aiSummary.riskLevel || 'LOW'}</p>
                      </div>
                      <div className="p-3 bg-[#161616] rounded-xl border border-[#222]">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Language</span>
                        <p className="text-xs font-bold text-white mt-0.5">{data.aiSummary.language || 'en-IN'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-[#141414] rounded-xl border border-[#222]">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h4>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {data.aiSummary.summaryText || 'No AI summary generated for this call.'}
                      </p>
                    </div>

                    {data.aiSummary.transcript && (
                      <div className="p-4 bg-[#141414] rounded-xl border border-[#222]">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Transcript Excerpt</h4>
                        <p className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {data.aiSummary.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: NOTES & DISPOSITION */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <div className="p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl space-y-4">
                    <h3 className="font-bold text-sm text-white">Call Notes & Intake Form</h3>
                    
                    <div className="p-4 bg-[#141414] rounded-xl border border-[#222]">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Agent Notes</span>
                      <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap">
                        {data.notesAndDisposition.agentNotes || 'No notes entered by agent.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-[#141414] rounded-xl border border-[#222]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Call Outcome</span>
                        <p className="text-xs font-bold text-white mt-1">{data.notesAndDisposition.callOutcome}</p>
                      </div>
                      <div className="p-3 bg-[#141414] rounded-xl border border-[#222]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">CSAT Score</span>
                        <p className="text-xs font-bold text-amber-400 mt-1">★ {data.notesAndDisposition.csatScore} / 5</p>
                      </div>
                    </div>

                    {data.notesAndDisposition.intakeForm && Object.keys(data.notesAndDisposition.intakeForm).length > 0 && (
                      <div className="p-4 bg-[#141414] rounded-xl border border-[#222] space-y-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Intake Details</span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(data.notesAndDisposition.intakeForm).map(([key, value]) => {
                            if (typeof value === 'object' || key === 'notes') return null;
                            return (
                              <div key={key}>
                                <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>{' '}
                                <span className="text-slate-200 font-semibold">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIT TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="p-6 bg-[#111] border border-[#1e1e1e] rounded-2xl">
                    <h3 className="font-bold text-sm text-white mb-6">Call Handling Audit Timeline</h3>
                    <div className="relative pl-6 space-y-6 border-l border-[#222]">
                      {data.timeline?.map((item: any, i: number) => (
                        <div key={item.id || i} className="relative group">
                          {/* Dot */}
                          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                            item.type.includes('TRANSFER')
                              ? 'bg-cyan-500 border-cyan-300'
                              : item.type === 'ANSWERED'
                              ? 'bg-emerald-500 border-emerald-300'
                              : item.type === 'ENDED'
                              ? 'bg-rose-500 border-rose-300'
                              : 'bg-orange-500 border-orange-300'
                          }`}></div>
                          <div>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-white">{item.title}</h4>
                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(item.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                            {item.actor && (
                              <span className="text-[10px] text-slate-500 italic mt-0.5 block">Actor: {item.actor}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
