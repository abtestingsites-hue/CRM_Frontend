"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, User, Clock, Loader2, Circle, Pause, Play, ArrowRight, FileText, PhoneForwarded, History, Sparkles, CheckCircle2, RefreshCw, AlertCircle, Languages } from 'lucide-react';
import { useCallStore } from '@/store/useCallStore';
import { useSocket } from '@/providers/SocketProvider';
import { apiFetch } from '@/lib/api';
import { PostCallFeedbackModal } from '@/components/call-center/PostCallFeedbackModal';
import { LeadConversionModal } from '@/components/leads/LeadConversionModal';
import { CallIntakeFormModal } from '@/components/call-center/CallIntakeFormModal';
import { CallTransferModal } from '@/components/call-center/CallTransferModal';
import { CustomerHistoryDrawer } from '@/components/call-center/CustomerHistoryDrawer';
import { useMediasoup } from '@/hooks/useMediasoup';
import { LiveKitRoom, RoomAudioRenderer, useConnectionState, useRoomContext, useLocalParticipant, useRemoteParticipants } from '@livekit/components-react';
function LiveKitManager({ setCallState, setWebrtcConnected, callSid, isMuted, isSpeaker, callCategory, telephonySocket, onAudioBlockedChange, onRoomReady }: any) {
  const room = useRoomContext();
  const state = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  useEffect(() => {
    console.log('[LK-MANAGER]', 'mounted', { callSid, roomState: room?.state });
    if (room && typeof onRoomReady === 'function') {
      onRoomReady(room);
    }
    return () => console.log('[LK-MANAGER]', 'unmounted', { callSid });
  }, [callSid, room, onRoomReady]);

  const hasStartedRecording = useRef(false);
  const callEndedTriggeredRef = useRef(false);
  const hasEverConnectedRef = useRef(false);

  // Helper to mark call as CONNECTED and trigger recording once on verified answer
  const markConnectedAndRecord = () => {
    if (hasStartedRecording.current) return;
    hasStartedRecording.current = true;
    console.log(`[CALL-LIFECYCLE-DIAG] callId=${callSid} stage=CUSTOMER_ANSWERED source=livekit_sip_active timestamp=${new Date().toISOString()}`);
    setCallState('CONNECTED');
    setWebrtcConnected(true);
    if (telephonySocket && room) {
      console.log(`[CALL-RECORDING] Emitting callAnswered callSid=${callSid} roomName=${room.name}`);
      telephonySocket.emit('callAnswered', { callSid, roomName: room.name });
    }
  };

  const triggerCallEnd = (reason: string) => {
    if (callEndedTriggeredRef.current || useCallStore.getState().activeCall?.status === 'ENDED') return;
    callEndedTriggeredRef.current = true;
    console.log(`[CALL-LIFECYCLE-DIAG] callId=${callSid} stage=CALL_TERMINATED source=${reason} timestamp=${new Date().toISOString()}`);
    setCallState('ENDED');
    setWebrtcConnected(false);
    if (telephonySocket && room) {
      telephonySocket.emit('endCall', {
        callSid,
        roomName: room.name,
        reason: reason || 'explicit_user_end',
      });
    }
  };

  // Monitor Autoplay and Audio Playback Allowed State
  useEffect(() => {
    if (!room) return;

    const checkAudioPlayback = () => {
      const canPlay = (room as any).canPlaybackAudio;
      if (typeof onAudioBlockedChange === 'function') {
        onAudioBlockedChange(!canPlay);
      }
      if (!canPlay && typeof (room as any).startAudio === 'function') {
        (room as any).startAudio().catch((err: any) => {
          console.warn('[AUDIO-AUTOPLAY] Autoplay restricted. Awaiting agent interaction to unlock:', err?.message);
        });
      }
    };

    checkAudioPlayback();

    const handleAudioPlaybackChange = () => {
      const canPlay = (room as any).canPlaybackAudio;
      if (typeof onAudioBlockedChange === 'function') {
        onAudioBlockedChange(!canPlay);
      }
      console.log(`[AUDIO-PLAYBACK-STATUS] canPlaybackAudio=${canPlay}`);
    };

    room.on('audioPlaybackChanged', handleAudioPlaybackChange);

    return () => {
      room.off('audioPlaybackChanged', handleAudioPlaybackChange);
    };
  }, [room, onAudioBlockedChange]);

  useEffect(() => {
    console.log('[LK-MANAGER]', 'room_context_available', { callSid, roomName: room?.name, state: room?.state });
    if (!room) return;

    const logEvent = (eventName: string, ...args: any[]) => {
      console.log('[LK-ROOT]', JSON.stringify({
        callId: callSid,
        roomName: room.name,
        roomState: room.state,
        eventName: eventName,
        args: args.map(a => a?.identity || a?.message || a?.name || typeof a)
      }));
    };

    const checkSipStatus = (participantIdentity: string, status: string) => {
      console.log(`[CALL-LIVEKIT-SIP-STATE] callSessionId=${callSid} participantIdentity=${participantIdentity} sip.callStatus=${status}`);
      if (callEndedTriggeredRef.current) {
        console.warn(`[CALL-LIVEKIT-SIP-STATE] Ignored sip.callStatus=${status} for callSid=${callSid} because call has already ended.`);
        return;
      }
      if (status === 'active') {
        markConnectedAndRecord();
      } else if (status === 'hangup' || status === 'disconnect') {
        triggerCallEnd('sip_hangup');
      }
    };

    const events = {
      connected: () => {
        logEvent('connected');
        hasEverConnectedRef.current = true;
        if (typeof (room as any).startAudio === 'function') {
          (room as any).startAudio().catch(() => {});
        }
      },
      disconnected: (reason: any) => {
        logEvent('disconnected', reason);
        console.log(`[CALL-LIFECYCLE-DIAG] Room disconnected event: roomState=${room.state} connectionState=${state} callState=${useCallStore.getState().activeCall?.status} hasEverConnected=${hasEverConnectedRef.current} callId=${callSid} reason=${reason} terminationSource=room_disconnected (PSTN Call Preserved - Non-Destructive)`);
        setWebrtcConnected(false);
      },
      reconnecting: () => {
        logEvent('reconnecting');
        console.log(`[CALL-LIFECYCLE-DIAG] Room reconnecting: callId=${callSid}`);
        setWebrtcConnected(false);
      },
      reconnected: () => {
        logEvent('reconnected');
        console.log(`[CALL-LIFECYCLE-DIAG] Room reconnected: callId=${callSid}`);
        setWebrtcConnected(true);
      },
      mediaDevicesError: (e: any) => {
        logEvent('media_devices_error', e);
        console.error('[MEDIA-DEVICES-ERROR]', e);
      },
      participantConnected: (p: any) => {
        logEvent('participant_connected', p);
        if (callEndedTriggeredRef.current) return;
        // Only mark connected if customer has already answered (active)
        if (p.attributes?.['sip.callStatus'] === 'active') {
          markConnectedAndRecord();
        }
      },
      participantDisconnected: (p: any) => {
        logEvent('participant_disconnected', p);
        if (callEndedTriggeredRef.current || useCallStore.getState().activeCall?.status === 'ENDED') return;
        // If remote participant (PSTN customer) disconnects, customer hung up!
        if (!p.isLocal) {
          triggerCallEnd('customer_hangup');
        }
      },
      participantAttributesChanged: (changedAttributes: any, participant: any) => {
        if (participant.identity.startsWith('sip_') && changedAttributes['sip.callStatus']) {
          checkSipStatus(participant.identity, changedAttributes['sip.callStatus']);
        }
      },
      localTrackPublished: (t: any) => logEvent('local_track_published', t),
      localTrackUnpublished: (t: any) => logEvent('local_track_unpublished', t)
    };

    room.on('connected', events.connected);
    room.on('disconnected', events.disconnected);
    room.on('reconnecting', events.reconnecting);
    room.on('reconnected', events.reconnected);
    room.on('mediaDevicesError', events.mediaDevicesError);
    room.on('participantConnected', events.participantConnected);
    room.on('participantDisconnected', events.participantDisconnected);
    room.on('participantAttributesChanged', events.participantAttributesChanged);
    room.on('localTrackPublished', events.localTrackPublished);
    room.on('localTrackUnpublished', events.localTrackUnpublished);

    return () => {
      room.off('connected', events.connected);
      room.off('disconnected', events.disconnected);
      room.off('reconnecting', events.reconnecting);
      room.off('reconnected', events.reconnected);
      room.off('mediaDevicesError', events.mediaDevicesError);
      room.off('participantConnected', events.participantConnected);
      room.off('participantDisconnected', events.participantDisconnected);
      room.off('participantAttributesChanged', events.participantAttributesChanged);
      room.off('localTrackPublished', events.localTrackPublished);
      room.off('localTrackUnpublished', events.localTrackUnpublished);
    };
  }, [room, callSid]);

  // Check remote participants attributes for answer state
  // Check remote participants attributes for verified answer state
  useEffect(() => {
    if (!room || state !== 'connected') return;

    const hasRemote = remoteParticipants.length > 0;
    const hasActiveSip = remoteParticipants.some(p => 
      p.attributes?.['sip.callStatus'] === 'active' || 
      p.isSpeaking || 
      p.getTrackPublications().length > 0
    );

    if (hasRemote && (callCategory === 'Inbound' || hasActiveSip)) {
      markConnectedAndRecord();
      console.log('[CALL-LIFECYCLE-DIAG]', JSON.stringify({
        stage: 'CUSTOMER_ANSWERED',
        source: callCategory === 'Inbound' ? 'inbound_remote_participant_connected' : 'sip_active_confirmed',
        callId: callSid,
        roomName: room?.name,
        remoteParticipantCount: remoteParticipants.length,
        timestamp: new Date().toISOString(),
      }));
    } else if (callCategory === 'Outbound') {
      setCallState('RINGING');
      console.log('[CALL-LIFECYCLE-DIAG]', JSON.stringify({
        stage: 'PROVIDER_RINGING',
        source: 'sip_trunk_ringing',
        callId: callSid,
        roomName: room?.name,
        timestamp: new Date().toISOString(),
      }));
    } else {
      setCallState('CONNECTING');
    }
  }, [remoteParticipants, room, state, callCategory]);

  useEffect(() => {
    if (state === 'connected') {
      hasEverConnectedRef.current = true;
      setWebrtcConnected(true);
    } else if (state === 'connecting') {
      setWebrtcConnected(false);
    } else if (state === 'reconnecting') {
      setWebrtcConnected(false);
      console.warn('[CALL-LIFECYCLE-DIAG] WebRTC connection reconnecting. Preserving PSTN call.', { callId: callSid, state });
    } else if (state === 'disconnected') {
      setWebrtcConnected(false);
      console.log('[CALL-LIFECYCLE-DIAG] WebRTC connection in disconnected state. Preserving PSTN call without terminating.', { callId: callSid, state, hasEverConnected: hasEverConnectedRef.current });
    }
  }, [state, room, callSid, setCallState, setWebrtcConnected, callCategory, remoteParticipants]);

  // Handle Microphone Lifecycle safely
  useEffect(() => {
    if (state !== 'connected' || !room || !localParticipant) return;

    const manageMicrophone = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn('[WEBRTC-DIAGNOSTIC] mediaDevices.getUserMedia not available');
          return;
        }

        if (localParticipant.isMicrophoneEnabled === isMuted) {
          await localParticipant.setMicrophoneEnabled(!isMuted);
          console.log('[INBOUND-AUDIO] local_microphone_published | muted=' + isMuted);
        }
      } catch (err: any) {
        console.error('[WEBRTC-DIAGNOSTIC] Microphone sync failed:', err.message);
      }
    };

    manageMicrophone();
  }, [state, room, localParticipant, isMuted, callSid]);

  // Handle remote audio subscriptions without competing manual track.attach()
  useEffect(() => {
    if (!room) return;

    const handleTrackSubscribed = (track: any, publication: any, participant: any) => {
      if (track.kind === 'audio') {
        console.log(`[CALL-LIFECYCLE-DIAG] callId=${callSid} stage=AUDIO_CONNECTED source=trackSubscribed timestamp=${new Date().toISOString()} participant=${participant.identity} trackSid=${track.sid}`);
        if (typeof (room as any).startAudio === 'function') {
          (room as any).startAudio().catch(() => {});
        }
        // Note: RoomAudioRenderer handles declarative audio element rendering and volume/mute
      }
    };

    room.on('trackSubscribed', handleTrackSubscribed);

    return () => {
      room.off('trackSubscribed', handleTrackSubscribed);
    };
  }, [room, callSid]);

  return null;
}


function CallControlsInner({ 
  duration, 
  endCall, 
  connectionState,
  isSpeaker,
  toggleSpeaker,
  onTransferClick,
}: { 
  duration: number; 
  endCall: () => void; 
  connectionState: string;
  isSpeaker: boolean;
  toggleSpeaker: () => void;
  onTransferClick?: () => void;
}) {
  const { isMuted, toggleMute } = useCallStore();

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center gap-4 mt-6">
        <button 
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          disabled={connectionState !== 'CONNECTED'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            connectionState !== 'CONNECTED' ? 'bg-[#111] text-slate-600 cursor-not-allowed opacity-50' :
            isMuted ? 'bg-white text-black hover:bg-slate-200' : 'bg-[#222] text-white hover:bg-[#333] border border-[#333]'
          }`}
          title="Mute"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        
        <button 
          onClick={toggleSpeaker}
          aria-label={isSpeaker ? 'Disable speaker' : 'Enable speaker'}
          disabled={connectionState !== 'CONNECTED' && connectionState !== 'RINGING'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            connectionState !== 'CONNECTED' && connectionState !== 'RINGING' ? 'bg-[#111] text-slate-600 cursor-not-allowed opacity-50' :
            !isSpeaker ? 'bg-white text-black hover:bg-slate-200' : 'bg-[#222] text-white hover:bg-[#333] border border-[#333]'
          }`}
          title="Speaker"
        >
          {isSpeaker ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>

        {/* Live Call Transfer Button */}
        <button 
          onClick={onTransferClick}
          aria-label="Transfer Call"
          disabled={connectionState !== 'CONNECTED'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            connectionState !== 'CONNECTED' 
              ? 'bg-[#111] text-slate-600 cursor-not-allowed opacity-50' 
              : 'bg-[#1a232a] text-cyan-400 hover:bg-[#20303a] border border-cyan-500/40 hover:border-cyan-400 shadow-md shadow-cyan-500/10'
          }`}
          title="Transfer Call to Department or Agent"
        >
          <PhoneForwarded className="w-5 h-5" />
        </button>

        <button 
          onClick={endCall}
          aria-label="End call"
          className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 transition-transform active:scale-95 border-2 border-rose-400"
          title="End Call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}

interface PostCallIntelligenceCardProps {
  callSid: string;
  customerName: string;
  phoneNumber: string;
  duration: number;
  leadId?: string;
  category?: string;
  onOpenDisposition: () => void;
  onWrapUp: () => void;
  onOpenHistory?: () => void;
}

function PostCallIntelligenceCard({
  callSid,
  customerName,
  phoneNumber,
  duration,
  category,
  onOpenDisposition,
  onWrapUp,
  onOpenHistory,
}: PostCallIntelligenceCardProps) {
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string>('PROCESSING');
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [aiProcessingStatus, setAiProcessingStatus] = useState<string>('PENDING');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchIntelligence = async () => {
    try {
      const res = await apiFetch(`/api/v1/analytics/summaries/${callSid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recordingUrl) {
          setRecordingUrl(data.recordingUrl);
          setRecordingStatus('READY');
          if (data.recordingDuration) setAudioDuration(data.recordingDuration);
        } else if (data.recordingStatus) {
          setRecordingStatus(data.recordingStatus);
        }

        if (data.summary) {
          setAiSummary(data);
          setAiProcessingStatus('COMPLETED');
        } else if (data.aiProcessingStatus) {
          setAiProcessingStatus(data.aiProcessingStatus);
        }
      }
    } catch (e) {
      console.warn('[PostCallIntelligenceCard] Failed to fetch:', e);
    }
  };

  useEffect(() => {
    fetchIntelligence();
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count > 12) {
        clearInterval(interval);
        return;
      }
      fetchIntelligence();
    }, 3000);

    return () => clearInterval(interval);
  }, [callSid]);

  const togglePlay = () => {
    if (!audioRef.current || !recordingUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      await apiFetch(`/api/v1/analytics/calls/${callSid}/reprocess`, { method: 'POST' });
      await fetchIntelligence();
    } catch (e) {
      console.error('Reprocess failed', e);
    } finally {
      setIsReprocessing(false);
    }
  };

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-sm bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none bg-emerald-500"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Call Concluded</h3>
            <span className="text-[11px] text-slate-400 font-mono">Duration: {formatSecs(duration)}</span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#141414] text-slate-300 border border-[#282828] uppercase">
          {category || 'Voice Call'}
        </span>
      </div>

      {/* Customer Info */}
      <div className="bg-[#111215] p-3 rounded-xl border border-[#22242a] flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-white block truncate max-w-[200px]">
            {customerName && customerName !== 'Unknown' && customerName !== 'Customer'
              ? customerName
              : phoneNumber && phoneNumber !== 'Voice Line' && phoneNumber !== 'Unknown'
              ? phoneNumber
              : 'Customer'}
          </span>
          <span className="text-xs text-slate-400 font-mono block">{phoneNumber || 'Voice Line'}</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <button
              type="button"
              onClick={onOpenHistory}
              title="View Customer History"
              className="p-2 rounded-xl bg-[#181a20] hover:bg-[#252830] text-orange-400 border border-[#2a2d36] transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs font-semibold shadow"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center border border-primary/30">
            {((customerName && customerName !== 'Unknown' && customerName !== 'Customer' ? customerName : phoneNumber) || 'C').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Call Audio Recording Playback Player */}
      <div className="bg-[#111215] p-3.5 rounded-xl border border-[#22242a] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-400" />
            Audio Recording
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
            recordingStatus === 'READY' ? 'bg-emerald-500/20 text-emerald-400' :
            recordingStatus === 'PROCESSING' || recordingStatus === 'PENDING' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
            'bg-slate-800 text-slate-400'
          }`}>
            {recordingStatus === 'READY' ? 'Ready' : recordingStatus === 'PROCESSING' ? 'Processing' : recordingStatus}
          </span>
        </div>

        {recordingStatus === 'READY' && recordingUrl ? (
          <div className="space-y-2 pt-1">
            <audio
              ref={audioRef}
              src={recordingUrl}
              preload="metadata"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
                  setAudioDuration(e.currentTarget.duration);
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onError={(e) => console.warn('[PostCallIntelligenceCard] Audio playback error', e)}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div className="flex-1 space-y-1">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 1}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const newTime = parseFloat(e.target.value);
                    setCurrentTime(newTime);
                    if (audioRef.current) audioRef.current.currentTime = newTime;
                  }}
                  className="w-full h-1.5 bg-[#252830] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{formatSecs(currentTime)}</span>
                  <span>{formatSecs(audioDuration)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : recordingStatus === 'PROCESSING' || recordingStatus === 'PENDING' ? (
          <div className="py-2 flex items-center gap-2 text-xs text-amber-400 font-medium">
            <span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></span>
            <span>Syncing carrier audio recording...</span>
          </div>
        ) : (
          <div className="py-2 text-[11px] text-slate-500">
            Recording not ready or call duration was under threshold.
          </div>
        )}
      </div>

      {/* AI Call Summary Section */}
      <div className="bg-[#111215] p-3.5 rounded-xl border border-[#22242a] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI Intelligence Summary
          </span>
          {aiSummary?.sentiment && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
              aiSummary.sentiment === 'Positive' ? 'bg-emerald-500/20 text-emerald-400' :
              aiSummary.sentiment === 'Negative' ? 'bg-rose-500/20 text-rose-400' :
              'bg-slate-800 text-slate-400'
            }`}>
              {aiSummary.sentiment} ({aiSummary.sentimentScore || 5}/10)
            </span>
          )}
        </div>

        {aiSummary?.summary ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar p-2 bg-[#090a0c] rounded-lg border border-[#1e2026]">
              {aiSummary.summary}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {aiSummary.customerIntent && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181a1f] text-slate-300 border border-[#2a2c33]">
                  {aiSummary.customerIntent}
                </span>
              )}
              {aiSummary.detectedLanguage && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Languages className="w-3 h-3" /> {aiSummary.detectedLanguage}
                </span>
              )}
            </div>
          </div>
        ) : aiProcessingStatus === 'ANALYZING' || aiProcessingStatus === 'PENDING' || aiProcessingStatus === 'RECORDING_PENDING' ? (
          <div className="py-3 flex items-center justify-center gap-2 text-xs text-primary font-medium bg-[#0a0a0c] rounded-lg p-3 border border-[#1e2026]">
            <Sparkles className="w-4 h-4 animate-spin text-primary" />
            <span>AI synthesizing call audio & summary...</span>
          </div>
        ) : (
          <div className="py-2 flex items-center justify-between text-xs text-slate-500">
            <span>Summary awaiting generation.</span>
            <button
              type="button"
              onClick={handleReprocess}
              disabled={isReprocessing}
              className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-bold rounded flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isReprocessing ? 'animate-spin' : ''}`} />
              Generate
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={onOpenDisposition}
          className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>Add Disposition & CSAT</span>
        </button>

        <button
          type="button"
          onClick={onWrapUp}
          className="w-full py-2 px-4 rounded-xl bg-[#181a1f] hover:bg-[#252830] text-slate-300 font-semibold text-xs transition-colors text-center"
        >
          Wrap Up & Next Call
        </button>
      </div>
    </div>
  );
}

export function CallWidget() {
  const { activeCall, status, setStatus, setWebrtcConnected, connectedAt, setActiveCall, updateActiveCallStatus } = useCallStore();
  const { telephonySocket, mediaSocket } = useSocket();
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const roomContextRef = useRef<any>(null);
  const handleRoomReady = React.useCallback((r: any) => {
    roomContextRef.current = r;
  }, []);
  
  const callState = activeCall?.status || 'IDLE';

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Prevent duplicate endCall requests
  const endCallRequestedRef = useRef(false);

  // Track sessions where Call Intake was already opened to prevent duplicate auto-openings on rerenders/reconnects
  const autoOpenedSessionsRef = useRef<Set<string>>(new Set());

  // Canonical customer phone number resolution (Inbound caller ID vs Outbound dialed destination)
  const resolvedCustomerPhone = React.useMemo(() => {
    if (!activeCall) return '';
    // Outbound calls: use the customer destination number that the agent dialed
    if (activeCall.isCaller || activeCall.direction === 'OUTBOUND') {
      return activeCall.phone || '';
    }
    // Inbound calls: use the provider's actual caller ID rather than agent answering trunk/DID
    return (activeCall as any).caller || (activeCall as any).from || activeCall.phone || '';
  }, [activeCall]);

  const resolvedCustomerName = React.useMemo(() => {
    if (!activeCall) return '';
    const cross = activeCall.crossUnitLookup;
    if (cross?.name && cross.name !== 'Unknown' && cross.name !== 'Unknown Caller') return cross.name;
    if (cross?.matchingCustomer?.name) return cross.matchingCustomer.name;
    if (cross?.matchingLead?.customerName) return cross.matchingLead.customerName;
    if (activeCall.customerName && activeCall.customerName !== 'Customer' && activeCall.customerName !== 'Unknown Caller') {
      return activeCall.customerName;
    }
    if (activeCall.customerContext?.customer?.name) {
      return activeCall.customerContext.customer.name;
    }
    if (activeCall.customerContext?.lead?.customerName) {
      return activeCall.customerContext.lead.customerName;
    }
    return (activeCall as any).callerName || '';
  }, [activeCall]);

  // Client-side fallback lookup if customer name is missing or generic on active call
  useEffect(() => {
    const phone = resolvedCustomerPhone || activeCall?.phone;
    if (
      phone &&
      phone !== 'Unknown' &&
      !activeCall?.crossUnitLookup &&
      (!activeCall?.customerName || activeCall?.customerName === 'Customer')
    ) {
      apiFetch(`/api/v1/telephony/caller-lookup/${encodeURIComponent(phone)}`)
        .then(async (res) => {
          if (res.ok) {
            const lookup = await res.json();
            if (lookup && lookup.name) {
              const current = useCallStore.getState().activeCall;
              if (current && (current.phone === phone || current.caller === phone)) {
                setActiveCall({
                  ...current,
                  customerName: lookup.name,
                  crossUnitLookup: lookup,
                  customerContext: { customer: lookup.matchingCustomer, lead: lookup.matchingLead },
                  leadId: lookup.matchingLead?.id || current.leadId,
                });
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [resolvedCustomerPhone, activeCall?.phone]);

  // Automatically open Call Intake modal when a real call is initiated, ringing, or answered
  useEffect(() => {
    const currentSessionId = activeCall?.callSid || activeCall?.roomName;
    if (!currentSessionId) return;

    // Avoid opening intake modal for internal directory calls
    const isInternal = Boolean(
      activeCall?.isInternal || 
      activeCall?.callCategory === 'INTERNAL' ||
      activeCall?.type === 'INTERNAL' ||
      (activeCall?.phone && activeCall.phone.toLowerCase() === 'internal') ||
      (activeCall?.phone && activeCall.phone.startsWith('ext_'))
    );
    if (isInternal) return;

    // Open intake form for active call (dialing, ringing, connecting, connected)
    if (['DIALING', 'RINGING', 'CONNECTING', 'CONNECTED'].includes(callState)) {
      if (!autoOpenedSessionsRef.current.has(currentSessionId)) {
        autoOpenedSessionsRef.current.add(currentSessionId);
        setShowIntakeModal(true);
      }
    }
  }, [callState, activeCall?.callSid, activeCall?.roomName, activeCall?.isInternal, activeCall?.callCategory, activeCall?.type, activeCall?.phone]);

  useEffect(() => {
    // Reset guard when activeCall changes
    endCallRequestedRef.current = false;
  }, [activeCall?.callSid]);

  useEffect(() => {
    console.log('[LK-ROOT]', 'render', {
      callId: activeCall?.callSid,
      roomName: activeCall?.roomName,
      hasToken: !!activeCall?.token
    });
    console.log(`[INBOUND-E2E] CALLWIDGET_ACTIVE_CALL | hasActiveCall=${!!activeCall} callId=${activeCall?.callSid} roomName=${activeCall?.roomName} hasToken=${!!activeCall?.token}`);
    console.log('[INBOUND-CALL] call_widget_rendered | callId=' + activeCall?.callSid + ' caller=' + activeCall?.phone);
  }, [activeCall?.callSid, activeCall?.roomName, activeCall?.token, activeCall?.phone]);

  useEffect(() => {
    return () => {
      console.log('[LK-ROOT]', 'component_unmount', {
        callId: activeCall?.callSid
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync initial call state when activeCall changes
  useEffect(() => {
    if (activeCall && !activeCall.status && !activeCall.accepted) {
      updateActiveCallStatus(activeCall.isCaller ? 'CONNECTING' : 'RINGING');
    }
  }, [activeCall, updateActiveCallStatus]);

  // Call Timer
  useEffect(() => {
    if (callState === 'CONNECTED' || connectedAt) {
      timerRef.current = setInterval(() => {
        if (connectedAt) {
          setDuration(Math.floor((Date.now() - connectedAt) / 1000));
        } else {
          setDuration(prev => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState, connectedAt]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Determine if this is a LiveKit call
  const isLiveKit = !!activeCall?.token;

  // Use Mediasoup via custom hook when call is accepted (and not LiveKit)
  const { isMuted } = useCallStore();
  const { micState } = useMediasoup(
    (activeCall?.accepted && !isLiveKit) ? mediaSocket : null, 
    activeCall?.callSid,
    isMuted,
    isSpeaker
  );

  useEffect(() => {
    if (isLiveKit) return; // Handled by LiveKitConnectionSync
    if (micState === 'CONNECTED') {
      updateActiveCallStatus('CONNECTED');
      setWebrtcConnected(true);
    } else if (micState === 'CONNECTING') {
      updateActiveCallStatus('CONNECTING');
    } else if (micState === 'ERROR') {
      endCallLocally();
    }
  }, [micState, isLiveKit, updateActiveCallStatus]);



  useEffect(() => {
    if (activeCall?.status === 'ENDED') {
      endCallLocally();
    }
  }, [activeCall?.status]);

  const endCallLocally = () => {
    // updateActiveCallStatus('ENDED') is already handled by SocketProvider or endCall()
    setWebrtcConnected(false);
    setStatus('AVAILABLE');
    
    // Release pre-warmed microphone stream to turn off the hardware
    if ((window as any)._prewarmedAudioStream) {
      (window as any)._prewarmedAudioStream.getTracks().forEach((track: any) => track.stop());
      (window as any)._prewarmedAudioStream = null;
    }
  };

  const endCall = () => {
    if (!activeCall || activeCall.status === 'ENDED' || callState === 'ENDED') {
      return;
    }
    if (telephonySocket && activeCall) {
      if (endCallRequestedRef.current) {
        console.log('[END-CALL-FLOW]', JSON.stringify({
          callId: activeCall.callSid,
          source: 'explicit_user_end',
          event: 'ignored_duplicate'
        }));
        return;
      }
      
      endCallRequestedRef.current = true;
      console.log('[END-CALL-FLOW]', JSON.stringify({
        callId: activeCall.callSid,
        source: 'explicit_user_end',
        event: 'request'
      }));

      // Notify backend to teardown Exotel SIP if necessary
      let agentId = null;
      try {
        const stored = localStorage.getItem('crm_user');
        if (stored) agentId = JSON.parse(stored).agentId;
      } catch (e) { console.warn('[UI Exception Swallowed Fixed]:', e); }

      if ((activeCall.phone === 'Internal' || activeCall.phone === 'Internal Directory Call') && mediaSocket) {
        mediaSocket.emit('endCall', {
          callSid: activeCall.callSid,
          roomName: activeCall.roomName,
          isCaller: activeCall.isCaller,
          category: activeCall.category,
          agentId: agentId,
          reason: 'explicit_user_end'
        });
      } else if (telephonySocket) {
        telephonySocket.emit('endCall', { 
          callSid: activeCall.callSid,
          roomName: activeCall.roomName,
          isCaller: activeCall.isCaller,
          category: activeCall.category,
          agentId: agentId,
          duration: duration || 1,
          reason: 'explicit_user_end'
        });
      }
      
      console.log('[CALL-LIFECYCLE]', JSON.stringify({
        event: 'explicit_user_end',
        sessionID: activeCall.callSid,
        roomName: activeCall.roomName,
        currentCRMStatus: useCallStore.getState().status,
        reason: 'User explicitly clicked End Call in CRM',
      }));
      // DO NOT call endCallLocally() here! Wait for backend to emit callEnded.
    }
  };

  const handleFeedbackComplete = (endedCallSid?: string) => {
    setShowFeedbackModal(false);
    setShowConversionModal(false);
    
    const currentCall = useCallStore.getState().activeCall;
    if (!currentCall || currentCall.callSid === endedCallSid) {
      setActiveCall(null);
      setDuration(0);
    }
  };

  if (!activeCall && callState === 'IDLE' && !showFeedbackModal && !showConversionModal) {
    return (
      <div className="text-center w-full max-w-md">
        <div className="w-24 h-24 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner shadow-black/50 border border-[#222]">
           <Phone className="w-10 h-10 text-slate-700" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Ready for Calls</h2>
        <p className="text-slate-500 mb-8 text-sm">Select an agent or wait for incoming calls.</p>
        <div className="flex justify-center gap-2 mt-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className={`w-2 h-2 rounded-full ${telephonySocket ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className={`text-xs font-bold ${telephonySocket ? 'text-emerald-500' : 'text-amber-500'}`}>
              {telephonySocket ? 'System Online' : 'Connecting to System...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const customerData = activeCall?.customerContext?.customer;

  if (callState === 'ENDED' && activeCall) {
    return (
      <>
        <PostCallIntelligenceCard
          callSid={activeCall.callSid || activeCall.roomName || 'unknown'}
          customerName={resolvedCustomerName || customerData?.name || activeCall.customerName || 'Customer'}
          phoneNumber={resolvedCustomerPhone || customerData?.phone || activeCall.phone || 'Voice Line'}
          duration={duration}
          leadId={activeCall.leadId}
          category={activeCall.category || activeCall.direction}
          onOpenDisposition={() => {
            if (activeCall.category === 'Outbound' && activeCall.leadId) {
              setShowConversionModal(true);
            } else {
              setShowFeedbackModal(true);
            }
          }}
          onWrapUp={() => handleFeedbackComplete(activeCall.callSid)}
          onOpenHistory={() => setShowCustomerHistory(true)}
        />

        {showFeedbackModal && (
          <PostCallFeedbackModal 
            callSid={activeCall.callSid || 'unknown'} 
            onClose={() => handleFeedbackComplete(activeCall.callSid)} 
            onSubmit={() => handleFeedbackComplete(activeCall.callSid)} 
          />
        )}

        {showConversionModal && (
          <LeadConversionModal 
            leadId={activeCall.leadId || ''} 
            onClose={() => handleFeedbackComplete(activeCall.callSid)} 
            onSubmit={() => handleFeedbackComplete(activeCall.callSid)} 
          />
        )}

        {showIntakeModal && (
          <CallIntakeFormModal
            callSid={activeCall?.callSid || activeCall?.roomName || 'unknown'}
            customerName={resolvedCustomerName}
            phoneNumber={resolvedCustomerPhone}
            leadId={activeCall?.leadId}
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            onSuccess={() => setShowIntakeModal(false)}
          />
        )}

        {showCustomerHistory && (
          <CustomerHistoryDrawer
            identifier={resolvedCustomerPhone || resolvedCustomerName || activeCall?.customerId || activeCall?.phone || null}
            isOpen={showCustomerHistory}
            onClose={() => setShowCustomerHistory(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="w-full max-w-sm bg-[#0a0a0a]/80 backdrop-blur-xl border border-[#222] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Background Glow Effect */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${
          callState === 'CONNECTED' ? 'bg-emerald-500' : 
          callState === 'RINGING' ? 'bg-primary' : 
          callState === 'ENDED' ? 'bg-rose-500' : 'bg-blue-500'
        }`}></div>

        <div className="relative z-10">
          {/* Header Status */}
          <div className="flex justify-between items-center mb-8">
            <span className={`text-xs font-bold tracking-wider px-3 py-1 rounded-full uppercase flex items-center gap-2 ${
              callState === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
              callState === 'RINGING' ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse' : 
              callState === 'ENDED' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
              'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            }`}>
              {callState === 'CONNECTED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
              {callState}
            </span>
            {callState === 'CONNECTED' && (
              <span className="font-mono font-bold text-white tracking-widest text-lg flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                {formatTime(duration)}
              </span>
            )}
          </div>

          {/* Profile / Caller Info */}
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="relative mb-4">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-lg transition-all duration-500 ${
                callState === 'CONNECTED' ? 'border-emerald-500/50 bg-[#111] text-emerald-400 shadow-emerald-500/20' : 
                callState === 'RINGING' ? 'border-primary/50 bg-[#111] text-primary shadow-primary/20 animate-bounce' : 
                'border-[#333] bg-[#111] text-white shadow-black'
              }`}>
                {((resolvedCustomerName && resolvedCustomerName !== 'Customer' ? resolvedCustomerName : activeCall?.customerName && activeCall.customerName !== 'Customer' ? activeCall.customerName : resolvedCustomerPhone) || 'C').substring(0, 1).toUpperCase()}
              </div>
              
              {/* Recording Indicator */}
              {callState === 'CONNECTED' && (
                <div className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-rose-400 shadow-lg animate-pulse">
                  <Circle className="w-3 h-3 fill-current" /> REC
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-1 truncate w-full text-center">
              {resolvedCustomerName && resolvedCustomerName !== 'Customer'
                ? resolvedCustomerName
                : customerData?.name ||
                  (activeCall?.customerName && activeCall.customerName !== 'Customer' ? activeCall.customerName : null) ||
                  resolvedCustomerPhone ||
                  'Customer'}
            </h2>
            <p className="text-slate-400 flex items-center gap-2 mb-2">
              {callState === 'CONNECTING' && <Loader2 className="w-3 h-3 animate-spin" />}
              {resolvedCustomerPhone || customerData?.phone || activeCall?.phone || 'VoIP WebRTC Link'}
            </p>
            
          {/* LiveKit Connection */}
          {activeCall?.accepted && isLiveKit && (
            <div className="mt-4 w-full">
              {audioBlocked && (
                <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center justify-between gap-2 shadow-lg animate-pulse">
                  <span className="font-semibold">Speaker audio paused by browser.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (roomContextRef.current && typeof roomContextRef.current.startAudio === 'function') {
                        roomContextRef.current.startAudio().then(() => setAudioBlocked(false)).catch(console.error);
                      }
                    }}
                    className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 text-xs shrink-0 shadow"
                  >
                    Enable Speaker
                  </button>
                </div>
              )}
              <LiveKitRoom
                key={`${activeCall.callSid}_${activeCall.roomName}`}
                serverUrl={activeCall?.serverUrl || activeCall?.wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://23jy3gv6xcs.livekit.cloud'}
                token={activeCall.token}
                connect={callState !== 'ENDED'}
                audio={!isMuted} // Pre-warms and publishes audio on initial connection
                video={false}
              >
                <RoomAudioRenderer volume={isSpeaker ? 1 : 0} muted={!isSpeaker} />
                <LiveKitManager 
                  setCallState={updateActiveCallStatus} 
                  setWebrtcConnected={setWebrtcConnected} 
                  callSid={activeCall.callSid}
                  isMuted={isMuted}
                  isSpeaker={isSpeaker}
                  callCategory={activeCall.category}
                  telephonySocket={telephonySocket}
                  onAudioBlockedChange={setAudioBlocked}
                  onRoomReady={handleRoomReady}
                />
              </LiveKitRoom>
              <CallControlsInner 
                duration={duration} 
                endCall={endCall}
                connectionState={callState}
                isSpeaker={isSpeaker}
                toggleSpeaker={() => setIsSpeaker(!isSpeaker)}
                onTransferClick={() => setShowTransferModal(true)}
              />
            </div>
          )}

          {/* Mediasoup Connection State */}
          {activeCall?.accepted && !isLiveKit && (
            <div className="mt-4 w-full">
              <CallControlsInner 
                duration={duration} 
                endCall={endCall}
                connectionState={callState}
                isSpeaker={isSpeaker}
                toggleSpeaker={() => setIsSpeaker(!isSpeaker)}
                onTransferClick={() => setShowTransferModal(true)}
              />
            </div>
          )}
          {/* Action triggers: Pre-Call/Active-Call Customer History & Intake */}
          {activeCall && (
            <div className="w-full flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCustomerHistory(true)}
                className="flex-1 py-2 px-2.5 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/40 text-orange-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                title="View customer cross-unit interaction history, previous enquiries and recordings"
              >
                <History className="w-4 h-4 text-orange-400" />
                <span>Customer History</span>
              </button>

              <button
                type="button"
                onClick={() => setShowIntakeModal(true)}
                className="flex-1 py-2 px-2.5 rounded-xl bg-[#141e26] hover:bg-[#1b2934] border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Intake & Notes</span>
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {showIntakeModal && (
        <CallIntakeFormModal
          callSid={activeCall?.callSid || activeCall?.roomName || 'unknown'}
          customerName={resolvedCustomerName}
          phoneNumber={resolvedCustomerPhone}
          leadId={activeCall?.leadId}
          isOpen={showIntakeModal}
          onClose={() => setShowIntakeModal(false)}
          onSuccess={() => setShowIntakeModal(false)}
        />
      )}

      {showTransferModal && (
        <CallTransferModal
          callSid={activeCall?.callSid || activeCall?.roomName || 'unknown'}
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            setActiveCall(null);
            setStatus('AVAILABLE');
          }}
          callerName={resolvedCustomerName}
          callerPhone={resolvedCustomerPhone}
        />
      )}

      {showFeedbackModal && (
        <PostCallFeedbackModal 
          callSid={activeCall?.callSid || 'unknown'} 
          onClose={handleFeedbackComplete} 
          onSubmit={handleFeedbackComplete} 
        />
      )}

      {showConversionModal && (
        <LeadConversionModal 
          leadId={activeCall?.leadId || ''} 
          onClose={handleFeedbackComplete} 
          onSubmit={handleFeedbackComplete} 
        />
      )}

      {showCustomerHistory && (
        <CustomerHistoryDrawer
          identifier={resolvedCustomerPhone || resolvedCustomerName || ''}
          isOpen={showCustomerHistory}
          onClose={() => setShowCustomerHistory(false)}
        />
      )}
    </>
  );
}

