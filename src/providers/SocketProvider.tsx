"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';
import { useConversationStore } from '@/store/conversationStore';
import { useCallStore } from '@/store/useCallStore';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { api, apiFetch, API_BASE_URL } from '@/lib/api';

interface SocketContextProps {
  socket: Socket | null;
  telephonySocket: Socket | null;
  mediaSocket: Socket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextProps>({
  socket: null,
  telephonySocket: null,
  mediaSocket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

// Global singleton managed socket connection to prevent duplicate sockets across tabs/renders
let globalSocket: Socket | null = null;
let lastLoggedInSocketId: string | null | undefined = null;

/**
 * Standardized token retrieval for WebSocket handshake and reconnection.
 * Exclusively reads valid CRM application tokens, avoiding third-party/Supabase pollution.
 */
export const getStoredToken = (): string => {
  if (typeof window === 'undefined') return '';
  const token =
    localStorage.getItem('paramantra_access_token') ||
    localStorage.getItem('crm_token');
  return token ? token.trim().replace(/^["']|["']$/g, '') : '';
};

/**
 * Synchronize newly refreshed tokens directly with the active managed socket connection
 */
export const updateSocketAuthToken = (newToken: string) => {
  if (globalSocket) {
    const cleanToken = newToken ? newToken.trim().replace(/^["']|["']$/g, '') : '';
    const currentAuth = typeof globalSocket.auth === 'object' ? globalSocket.auth : {};
    globalSocket.auth = {
      ...currentAuth,
      token: cleanToken,
    };
    console.log('[AGENT-SOCKET] Dynamic socket.auth token updated following token rotation');
  }
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const unsubscribeCallStoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Session cleanup on logout
    if (!user) {
      if (globalSocket) {
        console.log('[AGENT-SOCKET] User logged out, disconnecting managed socket');
        globalSocket.disconnect();
        globalSocket = null;
        lastLoggedInSocketId = null;
      }
      setIsConnected(false);
      setSocket(null);
      return;
    }

    const targetUrl = API_BASE_URL.replace(/\/$/, '');

    // Initialize the single canonical managed socket if not already created
    if (!globalSocket) {
      console.log(`[AGENT-SOCKET] Creating single managed WebSocket connection to ${targetUrl}`);
      const initialToken = getStoredToken();

      globalSocket = io(targetUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        auth: (cb: (data: any) => void) => {
          // Dynamic auth callback evaluated on every handshake and reconnect attempt
          const freshToken = getStoredToken();
          cb({
            token: freshToken,
            agentId: user.agentId || user.id,
          });
        },
      });

      // Update static auth property as fallback for reconnect managers
      globalSocket.auth = {
        token: initialToken,
        agentId: user.agentId || user.id,
      };

      // Always resolve latest stored token on reconnect attempts
      globalSocket.io.on('reconnect_attempt', () => {
        const freshToken = getStoredToken();
        console.log('[AGENT-SOCKET] Reconnecting socket with fresh token...');
        if (globalSocket) {
          globalSocket.auth = {
            token: freshToken,
            agentId: user.agentId || user.id,
          };
        }
      });

      globalSocket.on('connect_error', async (err: any) => {
        console.warn('[AGENT-SOCKET] Connection/Handshake error:', err?.message);
        if (err?.message?.includes('TOKEN_EXPIRED') || err?.message?.includes('AUTH_REJECTED')) {
          console.log('[AGENT-SOCKET] Handshake rejected due to expired token. Triggering dynamic refresh...');
          try {
            const newToken = await api.refreshAccessToken();
            if (newToken && globalSocket) {
              globalSocket.auth = {
                token: newToken,
                agentId: user.agentId || user.id,
              };
              console.log('[AGENT-SOCKET] Reconnecting socket with refreshed auth credentials...');
              globalSocket.connect();
              return;
            }
          } catch (refreshErr) {
            console.error('[AGENT-SOCKET] Dynamic refresh on handshake error failed:', refreshErr);
          }
        }
        const freshToken = getStoredToken();
        if (globalSocket) {
          globalSocket.auth = {
            token: freshToken,
            agentId: user.agentId || user.id,
          };
        }
      });
    } else {
      // Update auth payload with current agent identity
      const freshToken = getStoredToken();
      globalSocket.auth = {
        token: freshToken,
        agentId: user.agentId || user.id,
      };
    }

    const socketInstance = globalSocket;
    setSocket(socketInstance);

    const emitAgentLoginOnce = (targetSocket: Socket) => {
      if (!targetSocket.connected) return;
      if (lastLoggedInSocketId === targetSocket.id) {
        return; // Idempotency check: already registered on this exact socket connection ID
      }
      lastLoggedInSocketId = targetSocket.id;

      const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Agent');
      const token = getStoredToken();

      console.log(`[AGENT-SOCKET] Emitting agent_login for socketId=${targetSocket.id} agentId=${user.agentId || user.id}`);
      targetSocket.emit('agent_login', {
        agentId: user.agentId || user.id,
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        department: user.department || 'General',
        token,
      });
    };

    const handleConnect = () => {
      setIsConnected(true);
      setSocket(socketInstance);
      console.log(`[AGENT-SOCKET] Managed socket connected (socketId: ${socketInstance.id})`);
      emitAgentLoginOnce(socketInstance);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      console.log(`[AGENT-SOCKET] Managed socket disconnected: ${reason} (socketId: ${socketInstance.id})`);
      if (lastLoggedInSocketId === socketInstance.id) {
        lastLoggedInSocketId = null;
      }
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Initial Login Emission if already connected
    if (socketInstance.connected) {
      setIsConnected(true);
      setSocket(socketInstance);
      emitAgentLoginOnce(socketInstance);
    }

    // ==========================================
    // INBOUND TELEPHONY & WEBRTC SIGNALING
    // ==========================================
    const handleIncomingCall = (data: any) => {
      console.log(
        `[INBOUND-E2E] STEP=FRONTEND_INCOMING_CALL_RECEIVED | event=incoming_call callId=${data.callSid || data.callId} roomName=${data.roomName} direction=${data.direction} provider=${data.provider || data.source} caller=${data.caller}`
      );

      // Explicit Guard: Ignore any outbound calls (placed by agent)
      const isOutbound =
        (data.direction && data.direction.toUpperCase() === 'OUTBOUND') ||
        (data.category && data.category.toLowerCase() === 'outbound') ||
        (data.roomName && data.roomName.startsWith('call_outbound_')) ||
        (data.callSid && data.callSid.startsWith('call_outbound_')) ||
        data.isCaller;

      if (isOutbound) {
        console.log('[INBOUND-CALL] Ignoring outbound call event in handleIncomingCall');
        return;
      }

      // Target agent validation: ensure this call is intended for THIS specific agent
      const currentAgentId = user?.agentId || user?.id;
      const currentUserId = user?.userId || user?.id;
      const targetAgentId = data.destinationAgentId || data.targetAgentId || data.assignedAgent?.id;
      const targetUserId = data.destinationUserId || data.targetUserId || data.assignedAgent?.userId;

      if (targetAgentId || targetUserId) {
        const isIntendedRecipient =
          (targetAgentId && (targetAgentId === currentAgentId || targetAgentId === currentUserId)) ||
          (targetUserId && (targetUserId === currentUserId || targetUserId === currentAgentId));

        if (!isIntendedRecipient) {
          console.log(`[INBOUND-CALL] Call not targeted to current agent (${currentAgentId}), ignoring.`);
          return;
        }
      }

      const { status, fetchDashboardCalls, activeCall } = useCallStore.getState();
      fetchDashboardCalls();

      // Guard: do not pop up incoming call for active outbound call session
      if (activeCall && (activeCall.callSid === data.callSid || activeCall.roomName === data.roomName)) {
        return;
      }

      if (status === 'AVAILABLE' || data.isTransfer) {
        console.log(
          `[INBOUND-CALL] incoming_call_state_set | roomName=${data.roomName} caller=${data.caller} direction=${data.direction || 'INBOUND'} token_exists=${Boolean(data.token)} isTransfer=${data.isTransfer}`
        );
        useCallStore.getState().setIncomingCall(data);
      } else {
        console.log('Agent is not available, ignoring call.');
      }
    };

    const handleIncomingCallTransfer = (data: any) => {
      console.log('[SOCKET] incoming_call_transfer received:', data);
      const currentAgentId = user?.agentId || user?.id;
      const currentUserId = user?.userId || user?.id;
      if (!data.destinationAgentId || data.destinationAgentId === currentAgentId || data.destinationUserId === currentUserId) {
        handleIncomingCall(data);
      }
    };

    const handleCallTransferredOut = (data: any) => {
      console.log('[SOCKET] callTransferredOut received:', data);
      const currentAgentId = user?.agentId || user?.id;
      if (data.initiatingAgentId && data.initiatingAgentId !== currentAgentId) {
        return;
      }
      const { activeCall, setActiveCall, setStatus, setWebrtcConnected } = useCallStore.getState();
      if (activeCall && (activeCall.callSid === data.callSid || activeCall.roomName === data.roomName || !data.callSid)) {
        setActiveCall(null);
        setWebrtcConnected(false);
        setStatus('AVAILABLE');
      }
    };

    const handleIncomingEmergencyCall = (data: any) => {
      console.log('Incoming EMERGENCY WebRTC Call:', data);
      useCallStore.getState().setIncomingCall(data);
    };

    const handleAgentAssigned = (data: any) => {
      const { incomingCall } = useCallStore.getState();
      if (incomingCall && incomingCall.callSid === data.callSid) {
        useCallStore.getState().setIncomingCall(null);
      }
    };

    const handleCallConnected = (data: any) => {
      console.log(`[SOCKET] callConnected received | dataCallSid=${data?.callSid} dataRoomName=${data?.roomName}`);
      const { activeCall, updateActiveCallStatus } = useCallStore.getState();
      const isMatching = Boolean(activeCall && (
        activeCall.callSid === data?.callSid ||
        activeCall.roomName === data?.callSid ||
        activeCall.callSid === data?.roomName ||
        activeCall.roomName === data?.roomName ||
        (data?.sessionId && (activeCall.callSid === data.sessionId || (activeCall as any).sessionId === data.sessionId))
      ));
      if (isMatching) {
        updateActiveCallStatus('CONNECTED');
      }
    };

    const handleCallRoomUpdated = (data: any) => {
      console.log('[INBOUND-CALL] callRoomUpdated received:', data);
      const { incomingCall, activeCall, setIncomingCall, setActiveCall } = useCallStore.getState();
      const targetCallSid = data.callSid || data.callId;
      if (incomingCall && (incomingCall.callSid === targetCallSid || incomingCall.roomName === targetCallSid || (incomingCall as any).id === targetCallSid)) {
        setIncomingCall({
          ...incomingCall,
          roomName: data.roomName,
          token: data.token,
          serverUrl: data.serverUrl || data.wsUrl || incomingCall.serverUrl,
          wsUrl: data.wsUrl || data.serverUrl || incomingCall.wsUrl,
        });
      }
      if (activeCall && (activeCall.callSid === targetCallSid || activeCall.roomName === targetCallSid || (activeCall as any).id === targetCallSid)) {
        setActiveCall({
          ...activeCall,
          roomName: data.roomName,
          token: data.token,
          serverUrl: data.serverUrl || data.wsUrl || activeCall.serverUrl,
          wsUrl: data.wsUrl || data.serverUrl || activeCall.wsUrl,
        });
      }
    };

    const handleCallAcceptedConfirmed = (data: any) => {
      console.log('[INBOUND-CALL] callAcceptedConfirmed received:', data);
      const { activeCall, setActiveCall } = useCallStore.getState();
      const targetCallSid = data.callSid || data.callId;
      if (activeCall && (activeCall.callSid === targetCallSid || activeCall.roomName === targetCallSid || (activeCall as any).id === targetCallSid)) {
        setActiveCall({
          ...activeCall,
          roomName: data.roomName,
          token: data.token,
          serverUrl: data.serverUrl || data.wsUrl || activeCall.serverUrl,
          wsUrl: data.wsUrl || data.serverUrl || activeCall.wsUrl,
        });
      }
    };

    const handleCallEnded = (data: any) => {
      console.log(
        `[INBOUND-E2E] CALL_ENDED_RECEIVED | dataCallSid=${data?.callSid} dataRoomName=${data?.roomName} activeCallSid=${useCallStore.getState().activeCall?.callSid}`
      );
      const { setIncomingCall, setWebrtcConnected, fetchDashboardCalls, activeCall, updateActiveCallStatus, setActiveCall, setStatus } =
        useCallStore.getState();

      setIncomingCall(null);
      setWebrtcConnected(false);
      fetchDashboardCalls();

      const isMatching = Boolean(activeCall && (
        activeCall.callSid === data?.callSid ||
        activeCall.roomName === data?.callSid ||
        activeCall.callSid === data?.roomName ||
        activeCall.roomName === data?.roomName ||
        (data?.sessionId && (activeCall.callSid === data.sessionId || (activeCall as any).sessionId === data.sessionId))
      ));

      if (isMatching) {
        updateActiveCallStatus('ENDED');
        // Grace period before clearing activeCall from store to ensure stale calls never persist across routes
        setTimeout(() => {
          const current = useCallStore.getState().activeCall;
          if (current && current.status === 'ENDED') {
            setActiveCall(null);
            setStatus('AVAILABLE');
          }
        }, 3000);
      }
    };

    const handleCallRejected = (data: any) => {
      console.log('Call rejected', data);
      const { setIncomingCall, fetchDashboardCalls } = useCallStore.getState();
      setIncomingCall(null);
      fetchDashboardCalls();
    };

    const handleCallAccepted = (data: any) => {
      const { activeCall, setActiveCall } = useCallStore.getState();
      const isMatching = Boolean(activeCall && (
        activeCall.callSid === data?.callSid ||
        activeCall.roomName === data?.callSid ||
        activeCall.callSid === data?.roomName ||
        activeCall.roomName === data?.roomName
      ));
      if (isMatching && activeCall) {
        setActiveCall({ ...activeCall, accepted: true });
      }
    };

    // Presence update synchronization
    if (unsubscribeCallStoreRef.current) {
      unsubscribeCallStoreRef.current();
    }
    unsubscribeCallStoreRef.current = useCallStore.subscribe((state, prevState) => {
      if (state.status !== prevState.status && socketInstance.connected) {
        socketInstance.emit('status_update', { status: state.status });
      }
    });

    // ==========================================
    // OMNICHANNEL & MESSAGING
    // ==========================================
    const handleNewWhatsAppMessage = (payload: any) => useConversationStore.getState().handleIncomingMessage(payload);
    const handleNewEmailMessage = (payload: any) => useConversationStore.getState().handleIncomingMessage(payload);
    const handleCustomerTyping = (data: any) => useConversationStore.getState().setTypingStatus(data.conversationId, data.isTyping);
    const handleInstagramProfileUpdated = (payload: any) => {
      useConversationStore.getState().updateCustomerIdentity(payload);
    };
    const handleCustomerIdentityUpdated = (payload: any) => {
      useConversationStore.getState().updateCustomerIdentity(payload);
    };

    const handleNewMessage = (payload: any) => {
      if (payload.conversation && payload.message && payload.customer) {
        useConversationStore.getState().handleIncomingMessage(payload);
      } else if (payload.conversationId && payload.message) {
        useConversationStore.getState().addMessage(payload.conversationId, payload.message);
      }
    };

    const handleConversationUpdated = () => {
      useConversationStore.getState().fetchConversations();
    };

    const handleAnalyticsUpdate = (data: any) => useAnalyticsStore.getState().setMetrics(data);

    const handleAiAnalysisUpdated = (data: any) => {
      const store = useConversationStore.getState();
      if (store.activeCustomerProfile?.id === data.customerId) {
        store.fetchCustomerProfile(data.customerId);
      }
    };

    // Attach unified listeners to single managed socket
    socketInstance.on('incoming_call', handleIncomingCall);
    socketInstance.on('incoming_call_transfer', handleIncomingCallTransfer);
    socketInstance.on('callTransferredOut', handleCallTransferredOut);
    socketInstance.on('incomingEmergencyCall', handleIncomingEmergencyCall);
    socketInstance.on('agentAssigned', handleAgentAssigned);
    socketInstance.on('callConnected', handleCallConnected);
    socketInstance.on('callRoomUpdated', handleCallRoomUpdated);
    socketInstance.on('callAcceptedConfirmed', handleCallAcceptedConfirmed);
    socketInstance.on('callEnded', handleCallEnded);
    socketInstance.on('callRejected', handleCallRejected);
    const handleAgentStatusChange = (data: any) => {
      if (!data?.agentId || !data?.status) return;
      const currentUserId = user?.id || (user as any)?.userId;
      const currentAgentId = (user as any)?.agentId;
      if (data.agentId === currentUserId || data.agentId === currentAgentId) {
        const { status, setStatus } = useCallStore.getState();
        if (status !== data.status) {
          console.log(`[AGENT-STATUS] Status updated: ${status} -> ${data.status}`);
          setStatus(data.status);
        }
      }
    };

    socketInstance.on('agent_status_change', handleAgentStatusChange);

    socketInstance.on('new_whatsapp_message', handleNewWhatsAppMessage);
    socketInstance.on('new_email_message', handleNewEmailMessage);
    socketInstance.on('instagram_profile_updated', handleInstagramProfileUpdated);
    socketInstance.on('customer_identity_updated', handleCustomerIdentityUpdated);
    socketInstance.on('customer_typing', handleCustomerTyping);
    socketInstance.on('new_message', handleNewMessage);
    socketInstance.on('conversationUpdated', handleConversationUpdated);
    socketInstance.on('analyticsUpdate', handleAnalyticsUpdate);
    socketInstance.on('ai_analysis_updated', handleAiAnalysisUpdated);

    useCallStore.getState().fetchDashboardCalls();
    setSocket(socketInstance);

    // Isolated HTTP Presence Polling (kept strictly separate from socket creation)
    const pollInterval = setInterval(async () => {
      const { status, incomingCall, setIncomingCall } = useCallStore.getState();
      const token = getStoredToken();
      if (!token) return;
      if (status === 'AVAILABLE' && !incomingCall && user?.id) {
        try {
          let baseUrl = process.env.NEXT_PUBLIC_API_URL || `${API_BASE_URL}`;
          if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
          const apiUrl = `${baseUrl}/telephony/my-ringing-call?agentId=${user.id}`;

          const res = await apiFetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.call) {
              const active = useCallStore.getState().activeCall;
              const isOutbound =
                (data.call.direction && data.call.direction.toUpperCase() === 'OUTBOUND') ||
                (data.call.category && data.call.category.toLowerCase() === 'outbound') ||
                (data.call.roomName && data.call.roomName.startsWith('call_outbound_')) ||
                (data.call.callSid && data.call.callSid.startsWith('call_outbound_')) ||
                data.call.isCaller ||
                active?.callSid === data.call.callSid ||
                active?.roomName === data.call.roomName;

              if (isOutbound) {
                console.log('[POLLING] Ignoring outbound or currently active call in polling:', data.call.callSid);
                return;
              }

              console.log('Polling found incoming call:', data.call);
              setIncomingCall(data.call);
            }
          }
        } catch (e) {
          console.warn('[UI Polling Exception Swallowed]:', e);
        }
      }
    }, 5000);

    // Listen for real-time token rotation events from API client
    const handleTokenRefreshed = (e: any) => {
      const newToken = e.detail?.token || getStoredToken();
      if (socketInstance) {
        socketInstance.auth = {
          token: newToken,
          agentId: user.agentId || user.id,
        };
        console.log('[AGENT-SOCKET] Socket auth token refreshed dynamically in real-time');
        if (!socketInstance.connected) {
          console.log('[AGENT-SOCKET] Socket disconnected after expiration; reconnecting with rotated token...');
          socketInstance.connect();
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('auth-token-refreshed', handleTokenRefreshed);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-token-refreshed', handleTokenRefreshed);
      }
      clearInterval(pollInterval);
      if (unsubscribeCallStoreRef.current) {
        unsubscribeCallStoreRef.current();
        unsubscribeCallStoreRef.current = null;
      }

      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('incoming_call', handleIncomingCall);
      socketInstance.off('incoming_call_transfer', handleIncomingCallTransfer);
      socketInstance.off('callTransferredOut', handleCallTransferredOut);
      socketInstance.off('incomingEmergencyCall', handleIncomingEmergencyCall);
      socketInstance.off('agentAssigned', handleAgentAssigned);
      socketInstance.off('callConnected', handleCallConnected);
      socketInstance.off('callRoomUpdated', handleCallRoomUpdated);
      socketInstance.off('callAcceptedConfirmed', handleCallAcceptedConfirmed);
      socketInstance.off('callEnded', handleCallEnded);
      socketInstance.off('callRejected', handleCallRejected);
      socketInstance.off('callAccepted', handleCallAccepted);
      socketInstance.off('agent_status_change', handleAgentStatusChange);

      socketInstance.off('new_whatsapp_message', handleNewWhatsAppMessage);
      socketInstance.off('new_email_message', handleNewEmailMessage);
      socketInstance.off('instagram_profile_updated', handleInstagramProfileUpdated);
      socketInstance.off('customer_identity_updated', handleCustomerIdentityUpdated);
      socketInstance.off('customer_typing', handleCustomerTyping);
      socketInstance.off('new_message', handleNewMessage);
      socketInstance.off('conversationUpdated', handleConversationUpdated);
      socketInstance.off('analyticsUpdate', handleAnalyticsUpdate);
      socketInstance.off('ai_analysis_updated', handleAiAnalysisUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.agentId]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        telephonySocket: socket,
        mediaSocket: socket,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
