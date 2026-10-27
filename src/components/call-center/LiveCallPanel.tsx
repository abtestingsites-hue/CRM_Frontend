"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useCallStore } from '@/store/useCallStore';
import { useSocket } from '@/providers/SocketProvider';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CallTimer } from './CallTimer';
import { CallControls } from './CallControls';
import { CallTransferModal } from './CallTransferModal';
import { CallIntakeFormModal } from './CallIntakeFormModal';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useConnectionState, 
  useRoomContext, 
  useRemoteParticipants 
} from '@livekit/components-react';

function LiveKitAudioBridge({
  callSid,
  setWebrtcConnected,
  updateActiveCallStatus,
  telephonySocket,
}: {
  callSid: string;
  setWebrtcConnected: (val: boolean) => void;
  updateActiveCallStatus: (status: any) => void;
  telephonySocket: any;
}) {
  const room = useRoomContext();
  const state = useConnectionState();
  const remoteParticipants = useRemoteParticipants();
  const hasStartedRecording = useRef(false);

  // Helper to mark call as CONNECTED once verified answer received
  const markConnectedAndRecord = () => {
    updateActiveCallStatus('CONNECTED');
    setWebrtcConnected(true);
    if (telephonySocket && room && !hasStartedRecording.current) {
      hasStartedRecording.current = true;
      console.log(`[CALL-RECORDING] Emitting callAnswered callSid=${callSid} roomName=${room.name}`);
      telephonySocket.emit('callAnswered', { callSid, roomName: room.name });
    }
  };

  // Browser Autoplay audio unlock
  useEffect(() => {
    if (room && typeof (room as any).startAudio === 'function') {
      (room as any).startAudio().catch((e: any) => console.log('[LIVEKIT-AUDIO] startAudio wait:', e));
    }
  }, [room, state]);

  useEffect(() => {
    if (!room) return;

    const events = {
      connected: () => {
        console.log('[LIVEKIT-AUDIO] Connected to room:', room.name);
        if (typeof (room as any).startAudio === 'function') {
          (room as any).startAudio().catch(() => {});
        }
      },
      participantConnected: (p: any) => {
        console.log('[LIVEKIT-AUDIO] Remote participant connected:', p.identity);
        if (!p.isLocal && p.attributes?.['sip.callStatus'] === 'active') {
          markConnectedAndRecord();
        }
      },
      participantDisconnected: (p: any) => {
        console.log('[LIVEKIT-AUDIO] Participant disconnected:', p.identity);
        if (!p.isLocal) {
          console.log('[LIVEKIT-AUDIO] Remote participant disconnected -> triggering call end');
          const targetSocket = telephonySocket;
          if (targetSocket) {
            targetSocket.emit('endCall', {
              callSid,
              roomName: room.name,
              reason: 'customer_hangup',
            });
          }
          updateActiveCallStatus('ENDED');
          useCallStore.getState().setActiveCall(null);
          useCallStore.getState().setStatus('AVAILABLE');
        }
      },
      participantAttributesChanged: (changedAttributes: any, participant: any) => {
        if (participant.identity?.startsWith('sip_')) {
          const sipStatus = changedAttributes['sip.callStatus'];
          if (sipStatus === 'active') {
            markConnectedAndRecord();
          } else if (sipStatus === 'hangup' || sipStatus === 'disconnect') {
            console.log('[LIVEKIT-AUDIO] SIP hangup detected -> triggering call end');
            const targetSocket = telephonySocket;
            if (targetSocket) {
              targetSocket.emit('endCall', {
                callSid,
                roomName: room.name,
                reason: 'sip_hangup',
              });
            }
            updateActiveCallStatus('ENDED');
            useCallStore.getState().setActiveCall(null);
            useCallStore.getState().setStatus('AVAILABLE');
          }
        }
      },
      trackSubscribed: (track: any, pub: any, participant: any) => {
        console.log('[LIVEKIT-AUDIO] Track subscribed:', track.kind, 'from', participant.identity);
        if (track.kind === 'audio' && participant.attributes?.['sip.callStatus'] === 'active') {
          markConnectedAndRecord();
        }
      }
    };

    room.on('connected', events.connected);
    room.on('participantConnected', events.participantConnected);
    room.on('participantDisconnected', events.participantDisconnected);
    room.on('participantAttributesChanged', events.participantAttributesChanged);
    room.on('trackSubscribed', events.trackSubscribed);

    return () => {
      room.off('connected', events.connected);
      room.off('participantConnected', events.participantConnected);
      room.off('participantDisconnected', events.participantDisconnected);
      room.off('participantAttributesChanged', events.participantAttributesChanged);
      room.off('trackSubscribed', events.trackSubscribed);
    };
  }, [room, callSid]);

  useEffect(() => {
    if (!room || state !== 'connected') return;

    if (remoteParticipants.length > 0) {
      const hasActive = remoteParticipants.some(p => p.attributes?.['sip.callStatus'] === 'active');
      if (hasActive) {
        markConnectedAndRecord();
      }
    }
  }, [remoteParticipants, room, state]);

  useEffect(() => {
    if (state === 'connected') {
      setWebrtcConnected(true);
    } else if (state === 'connecting') {
      updateActiveCallStatus('CONNECTING');
    } else if (state === 'disconnected') {
      setWebrtcConnected(false);
    }
  }, [state]);

  return null;
}

export const LiveCallPanel = () => {
  const { activeCall, setActiveCall, setStatus, webrtcConnected, setWebrtcConnected, updateActiveCallStatus, isMuted } = useCallStore();
  const { telephonySocket } = useSocket();
  const pathname = usePathname();

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const autoOpenedSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentSessionId = activeCall?.callSid || activeCall?.roomName;
    if (webrtcConnected && currentSessionId && activeCall?.status === 'CONNECTED') {
      const isInternal = Boolean(
        activeCall?.isInternal || 
        activeCall?.callCategory === 'INTERNAL' ||
        activeCall?.type === 'INTERNAL' ||
        (activeCall?.phone && activeCall.phone.toLowerCase() === 'internal') ||
        (activeCall?.phone && activeCall.phone.startsWith('ext_'))
      );

      if (!isInternal && !autoOpenedSessionsRef.current.has(currentSessionId)) {
        autoOpenedSessionsRef.current.add(currentSessionId);
        setShowIntakeModal(true);
      }
    }
  }, [webrtcConnected, activeCall?.status, activeCall?.callSid, activeCall?.roomName]);

  if (!activeCall || pathname?.includes('/call-center')) return null;

  const serverUrl = activeCall.serverUrl || activeCall.wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://23jy3gv6xcs.livekit.cloud';
  const hasLivekitToken = Boolean(activeCall.token);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bottom-0 left-1/2 transform -translate-x-1/2 mb-6 w-full max-w-2xl bg-[#050505] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-[#222] overflow-hidden z-40 flex flex-col"
      >
        {/* Background Ambient Glow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[100px] pointer-events-none transition-all duration-1000 ${
          webrtcConnected ? 'bg-emerald-500/20' : 'bg-primary/20'
        }`} />

        {activeCall.emergencyFlag && (
          <div className="bg-red-500 h-1 w-full animate-pulse" />
        )}
        
        {/* Real LiveKit WebRTC Audio Connection Engine */}
        {hasLivekitToken && activeCall.status !== 'ENDED' && (
          <LiveKitRoom
            key={`${activeCall.callSid}_${activeCall.roomName}`}
            serverUrl={serverUrl}
            token={activeCall.token}
            connect={activeCall.status !== 'ENDED'}
            audio={!isMuted}
            video={false}
          >
            <RoomAudioRenderer volume={1} muted={false} />
            <LiveKitAudioBridge
              callSid={activeCall.callSid || activeCall.roomName || 'active_call'}
              setWebrtcConnected={setWebrtcConnected}
              updateActiveCallStatus={updateActiveCallStatus}
              telephonySocket={telephonySocket}
            />
          </LiveKitRoom>
        )}

        <div className="p-6 flex flex-row items-center gap-6 relative z-10">
          {/* Caller Profile */}
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl border ${
                activeCall.emergencyFlag ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-blue-500/20 border-blue-500/30 text-blue-500'
              }`}>
                {activeCall.customerName?.charAt(0) || <User />}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>{activeCall.customerName || 'Customer'}</span>
                  {activeCall.isTransfer && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                      Transferred Call
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-[#111] border border-[#222] rounded text-xs font-mono text-slate-400">
                    {activeCall.phone || 'Incoming'}
                  </span>
                  <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-xs font-semibold">
                    {activeCall.category || 'Support'}
                  </span>
                  {activeCall.sourceAgent && (
                    <span className="text-[11px] text-slate-400">
                      From: <strong className="text-slate-200">{activeCall.sourceAgent.name}</strong> ({activeCall.sourceAgent.department})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Call Status & Timer */}
          <div className="flex flex-col items-center justify-center border-l border-[#222] pl-6">
            <CallTimer isActive={!!activeCall} />
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${webrtcConnected ? 'bg-emerald-500 animate-pulse' : 'bg-primary animate-pulse'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${webrtcConnected ? 'text-emerald-500' : 'text-primary'}`}>
                {webrtcConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="relative z-10">
          <CallControls 
            onTransferClick={() => setShowTransferModal(true)}
            onNotesClick={() => setShowIntakeModal(true)}
          />
        </div>

        {/* Transfer Modal */}
        {showTransferModal && (
          <CallTransferModal
            callSid={activeCall.callSid || activeCall.roomName || 'unknown'}
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            onSuccess={() => {
              setShowTransferModal(false);
              // Cleanly clear active call on transferring agent
              setActiveCall(null);
              setStatus('AVAILABLE');
            }}
            callerName={activeCall.customerName}
            callerPhone={activeCall.phone}
          />
        )}

        {/* Intake Notes Modal */}
        {showIntakeModal && (
          <CallIntakeFormModal
            callSid={activeCall.callSid || activeCall.roomName || 'unknown'}
            customerName={activeCall.customerName}
            phoneNumber={activeCall.phone}
            leadId={activeCall.leadId}
            isOpen={showIntakeModal}
            onClose={() => setShowIntakeModal(false)}
            onSuccess={() => setShowIntakeModal(false)}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
