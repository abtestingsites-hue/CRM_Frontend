import { create } from 'zustand';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export interface WidgetConfig {
  id: string;
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'funnel' | 'map';
  title: string;
  metricKey: string;
  w: number; // width in grid columns (1-3)
}

interface DashboardState {
  activeType: string;
  startDate: string;
  endDate: string;
  department: string;
  team: string;
  agentId: string;
  metrics: { kpis: any[]; charts: any };
  customWidgets: WidgetConfig[];
  isLoading: boolean;

  setActiveType: (type: string) => void;
  setFilters: (filters: Partial<Pick<DashboardState, 'startDate' | 'endDate' | 'department' | 'team' | 'agentId'>>) => void;
  fetchMetrics: () => Promise<void>;
  addCustomWidget: (widget: WidgetConfig) => void;
  removeCustomWidget: (id: string) => void;
  resetCustomWidgets: () => void;
}

const DEFAULT_CUSTOM_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'kpi', title: 'Pipeline Revenue', metricKey: 'Pipeline Value', w: 1 },
  { id: '2', type: 'kpi', title: 'Average Deal Size', metricKey: 'Avg Deal Size', w: 1 },
  { id: '3', type: 'bar', title: 'Monthly Revenue Share', metricKey: 'revenueTrend', w: 2 },
  { id: '4', type: 'pie', title: 'Channel Traffic Share', metricKey: 'channelShare', w: 1 },
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeType: (typeof window !== 'undefined' ? localStorage.getItem('crm_active_dashboard_type') : null) || 'overall',
  startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Last 30 Days
  endDate: new Date().toISOString().split('T')[0],
  department: 'All',
  team: 'All',
  agentId: 'All',
  metrics: { kpis: [], charts: {} },
  customWidgets: DEFAULT_CUSTOM_WIDGETS,
  isLoading: false,

  setActiveType: (type) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_active_dashboard_type', type);
    }
    set({ activeType: type });
    get().fetchMetrics();
  },

  setFilters: (filters) => {
    set(filters);
    get().fetchMetrics();
  },

  fetchMetrics: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('paramantra_access_token') || localStorage.getItem('crm_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const { activeType, startDate, endDate, department, team, agentId } = get();
      const selectedUnitId = typeof window !== 'undefined' ? localStorage.getItem('crm_global_selected_unit') : null;
      let url = `${API_BASE_URL}/dashboard/analytics?type=${activeType}`;
      if (startDate) url += `&startDate=${startDate}T00:00:00Z`;
      if (endDate) url += `&endDate=${endDate}T23:59:59Z`;
      if (department && department !== 'All') url += `&department=${department}`;
      if (team && team !== 'All') url += `&team=${team}`;
      if (agentId && agentId !== 'All') url += `&agentId=${agentId}`;
      if (selectedUnitId && selectedUnitId !== 'ALL') url += `&unitId=${encodeURIComponent(selectedUnitId)}`;

      const res = await apiFetch(url);

      if (res.ok) {
        const data = await res.json();
        set({ metrics: data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
    }
  },

  addCustomWidget: (widget) => {
    set((state) => ({ customWidgets: [...state.customWidgets, widget] }));
  },

  removeCustomWidget: (id) => {
    set((state) => ({ customWidgets: state.customWidgets.filter((w) => w.id !== id) }));
  },

  resetCustomWidgets: () => {
    set({ customWidgets: DEFAULT_CUSTOM_WIDGETS });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('crm-unit-changed', () => {
    useDashboardStore.getState().fetchMetrics();
  });
}
