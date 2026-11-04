import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export interface BusinessUnit {
  id: string;
  code: string;
  name: string;
  description?: string;
  status?: string;
}

const DEFAULT_UNITS: BusinessUnit[] = [
  { id: '7dd16366-3230-4adb-8390-a6ca7d6db465', code: 'UEC', name: 'Universal Enterprise Care (UEC)' },
  { id: 'eaa21ef8-d179-4ae5-b571-0711dde739a4', code: 'UNCF', name: 'United Nursing & Care Foundation (UNCF)' },
  { id: 'b72e1850-932d-4ef1-8a90-349092892911', code: 'ACARE', name: 'ACare (Ambulance & Care)' },
];

interface UnitState {
  units: BusinessUnit[];
  selectedUnitId: string | null; // null or 'ALL' = All Units Global View
  selectedUnit: BusinessUnit | null;
  isLoading: boolean;
  isSuperAdmin: boolean;

  fetchUnits: () => Promise<void>;
  setSelectedUnitId: (unitId: string | null) => void;
  initializeFromAuth: () => void;
}

export const useUnitStore = create<UnitState>((set, get) => ({
  units: DEFAULT_UNITS,
  selectedUnitId: typeof window !== 'undefined' ? (localStorage.getItem('crm_global_selected_unit') || null) : null,
  selectedUnit: null,
  isLoading: false,
  isSuperAdmin: false,

  initializeFromAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const storedUser = localStorage.getItem('crm_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const isSuper = user.role === 'SUPER_ADMIN';
        set({ isSuperAdmin: isSuper });

        // If not super admin, lock to user's assigned unit
        if (!isSuper && user.unitId) {
          set({ selectedUnitId: user.unitId });
        }
      }
    } catch (_) {}

    // Resolve initial unit
    const saved = localStorage.getItem('crm_global_selected_unit');
    const effective = (saved && saved !== 'ALL') ? saved : null;
    const currentUnits = get().units;
    const resolved = effective ? currentUnits.find(u => u.id === effective || u.code === effective) || null : null;
    set({ selectedUnitId: effective, selectedUnit: resolved });
    get().fetchUnits();
  },

  fetchUnits: async () => {
    set({ isLoading: true });
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('paramantra_access_token') || localStorage.getItem('crm_token')) : '';
      const res = await apiFetch('/api/v1/super-admin/units', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: BusinessUnit[] = data.map((u: any) => ({
            id: u.id,
            code: u.code,
            name: u.name,
            description: u.description,
            status: u.status,
          }));
          const currentId = get().selectedUnitId;
          const resolved = currentId ? mapped.find(u => u.id === currentId || u.code === currentId) || null : null;
          set({ units: mapped, selectedUnit: resolved, isLoading: false });
          return;
        }
      }
    } catch (_) {}
    set({ isLoading: false });
  },

  setSelectedUnitId: (unitId: string | null) => {
    const isAll = !unitId || unitId === 'ALL';
    const effectiveId = isAll ? null : unitId;
    const units = get().units;
    const unitObj = effectiveId ? units.find(u => u.id === effectiveId || u.code === effectiveId) || null : null;

    if (typeof window !== 'undefined') {
      if (effectiveId) {
        localStorage.setItem('crm_global_selected_unit', effectiveId);
      } else {
        localStorage.removeItem('crm_global_selected_unit');
      }

      // Broadcast event so all components/pages immediately re-fetch or filter
      window.dispatchEvent(
        new CustomEvent('crm-unit-changed', {
          detail: { unitId: effectiveId, unit: unitObj },
        })
      );
    }

    set({ selectedUnitId: effectiveId, selectedUnit: unitObj });
  },
}));

