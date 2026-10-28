import { create } from 'zustand';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export interface CallData {
  callSid: string;
  phone: string;
  customerName?: string;
  category?: string;
  queueType?: string;
  emergencyFlag?: boolean;
  ivrInput?: string;
  status?: string;
  duration?: number;
  isCaller?: boolean;
  customerId?: string;
  leadId?: string;
  accepted?: boolean;
  transcript?: string;
  roomName?: string;
  token?: string;
  customerContext?: any;
  urgency?: string;
  direction?: string;
  serverUrl?: string;
  wsUrl?: string;
  isInternal?: boolean;
  callCategory?: string;
  type?: string;
  caller?: string;
  callerName?: string;
  isTransfer?: boolean;
  transferAuditId?: string;
  transferMode?: string;
  transferReason?: string;
  sourceAgent?: { id?: string; name?: string; department?: string };
  destinationAgentId?: string;
  destinationUserId?: string;
  crossUnitLookup?: any;
  source?: string;
  sourceType?: string;
  campaign?: string;
  originalCallerId?: string;
  calledNumber?: string;
  trackingNumber?: string;
  referralSource?: string;
  sourceMetadata?: any;
  callerMatchStatus?: string;
}

export interface CallState {
  status: 'OFFLINE' | 'AVAILABLE' | 'BUSY' | 'ON_CALL' | 'WRAP_UP';
  baseStatus: string;
  incomingCall: CallData | null;
  activeCall: CallData | null;
  webrtcConnected: boolean;
  connectedAt: number | null;
  isMuted: boolean;
  isHold: boolean;
  queuedCalls: any[];
  missedCalls: any[];
  setStatus: (status: CallState['status']) => void;
  setBaseStatus: (status: string) => void;
  setIncomingCall: (call: CallData | null) => void;
  setActiveCall: (call: CallData | null) => void;
  updateActiveCallStatus: (status: 'DIALING' | 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDED') => void;
  setWebrtcConnected: (connected: boolean) => void;
  toggleMute: () => void;
  toggleHold: () => void;
  fetchDashboardCalls: () => Promise<void>;
}

export const useCallStore = create<CallState>((set) => ({
  status: 'AVAILABLE',
  baseStatus: 'AVAILABLE',
  incomingCall: null,
  activeCall: null,
  webrtcConnected: false,
  connectedAt: null,
  isMuted: false,
  isHold: false,
  queuedCalls: [],
  missedCalls: [],
  setStatus: (status) => set({ status }),
  setBaseStatus: (baseStatus) => set({ baseStatus }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call, connectedAt: null }), // reset timer on new call
  updateActiveCallStatus: (status) => set((state) => ({
    activeCall: state.activeCall ? { ...state.activeCall, status } : null,
    connectedAt: status === 'CONNECTED' && !state.connectedAt ? Date.now() : state.connectedAt
  })),
  setWebrtcConnected: (connected) => set((state) => ({
    webrtcConnected: connected,
    connectedAt: connected && !state.connectedAt ? Date.now() : state.connectedAt
  })),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleHold: () => set((state) => ({ isHold: !state.isHold })),
  fetchDashboardCalls: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL 
        ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
        : `${API_BASE_URL}`;
      const res = await apiFetch(`${baseUrl}/telephony/dashboard-calls`);
      if (res.ok) {
        const data = await res.json();
        set({ queuedCalls: data.queuedCalls || [], missedCalls: data.missedCalls || [] });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard calls:', err);
    }
  },
}));
