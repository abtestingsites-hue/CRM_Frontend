import { create } from 'zustand';
import { apiFetch, API_BASE_URL } from '@/lib/api';

interface Lead {
  id: string;
  customerName: string;
  phoneNumber: string;
  email: string | null;
  serviceInterest: string | null;
  source: string | null;
  status: string;
  conversionScore: number | null;
  sentiment: string | null;
  agentName: string;
  assignedAgentId: string | null;
  createdAt: string;
  nextFollowup?: string | null;
  foundation?: string | null;
  enquiryCategory?: string | null;
  primaryService?: string | null;
  subServices?: string[];
  patientName?: string | null;
  patientAge?: number | null;
  patientWeight?: number | null;
  patientWeightUnit?: string | null;
  patientConditions?: string | null;
  patientMobility?: string | null;
  engagementType?: string | null;
  careDurationCategory?: string | null;
  careDuration?: string | null;
  careSchedule?: string | null;
  secondaryPhone?: string | null;
  secondaryCountryCode?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  serviceAddress?: string | null;
  cityDistrict?: string | null;
  postalCode?: string | null;
  whatsappStatus?: string | null;
  whatsappVerifiedAt?: string | null;
  notes?: string | null;
  isAmbulanceEmergency?: boolean;
  enquirySummary?: string | null;
  lastCall?: any;
  // Phase 27 Agent Feedback & Disposition
  interestLevel?: string | null;
  customerDisposition?: string | null;
  agentFeedback?: string | null;
  nextAction?: string | null;
  followupDate?: string | null;
  followupTime?: string | null;
  followupType?: string | null;
  followupNotes?: string | null;
  feedbackAgentId?: string | null;
  feedbackAgentName?: string | null;
  feedbackSubmittedAt?: string | null;
  unit?: { id: string; name: string; code?: string } | null;
  unitName?: string | null;
  assignedAgent?: { id: string; name: string; agentCode?: string } | null;
  nextAppointment?: any;
}

interface LeadStore {
  leads: Lead[];
  activeLead: Lead | null;
  isLoading: boolean;
  setLeads: (leads: Lead[]) => void;
  setActiveLead: (lead: Lead | null) => void;
  claimLead: (leadId: string, agentId: string) => Promise<boolean>;

  fetchLeads: (token: string, query?: string) => Promise<void>;
  updateLeadStatus: (leadId: string, status: string, notes: string, token: string) => Promise<void>;
  addLead: (leadData: Partial<Lead>, token: string) => Promise<boolean>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
  : `${API_BASE_URL}`;

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  activeLead: null,
  isLoading: false,
  setLeads: (leads) => set({ leads }),
  setActiveLead: (lead) => set({ activeLead: lead }),

  fetchLeads: async (token, query = '') => {
    set({ isLoading: true });
    try {
      const selectedUnitId = typeof window !== 'undefined' ? localStorage.getItem('crm_global_selected_unit') : null;
      let scopedQuery = query;
      if (selectedUnitId && selectedUnitId !== 'ALL' && !scopedQuery.includes('unitId=') && !scopedQuery.includes('organization=')) {
        scopedQuery += (scopedQuery.includes('?') ? '&' : '?') + `unitId=${encodeURIComponent(selectedUnitId)}`;
      }
      const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('paramantra_access_token') : '') || '';
      const res = await apiFetch(`${API_URL}/api/v1/leads${scopedQuery}`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paramantra_access_token');
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      set({ leads: data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  claimLead: async (leadId: string, agentId: string) => {
    try {
      const token = (typeof localStorage !== 'undefined' ? localStorage.getItem('paramantra_access_token') : '') || '';
      const res = await apiFetch(`${API_URL}/api/v1/leads/${leadId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId })
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paramantra_access_token');
          window.location.href = '/login';
        }
        return false;
      }
      if (res.ok) {
        const lead = await res.json();
        // Update local state
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, ...lead, agentName: 'You' } : l)
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  updateLeadStatus: async (leadId: string, status: string, notes: string, token?: string) => {
    try {
      const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('paramantra_access_token') : '') || '';
      const res = await apiFetch(`${API_URL}/api/v1/leads/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ status, notes })
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paramantra_access_token');
          window.location.href = '/login';
        }
        return;
      }
      if (res.ok) {
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, status } : l)
        }));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lead-action-completed', { detail: leadId }));
        }
      }
    } catch (error) {
      console.error(error);
    }
  },

  addLead: async (leadData, token?: string) => {
    try {
      const activeToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('paramantra_access_token') : '') || '';
      const res = await apiFetch(`${API_URL}/api/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(leadData)
      });
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('paramantra_access_token');
          window.location.href = '/login';
        }
        return false;
      }
      if (res.ok) {
        const { lead } = await res.json();
        set((state) => ({
          leads: [lead, ...state.leads]
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}));

if (typeof window !== 'undefined') {
  window.addEventListener('crm-unit-changed', () => {
    useLeadStore.getState().fetchLeads('');
  });
}
