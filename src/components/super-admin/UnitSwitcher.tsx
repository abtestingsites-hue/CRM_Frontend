"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe2, Shield } from 'lucide-react';

export interface BusinessUnitOption {
  id: string;
  code: string;
  name: string;
  description?: string;
  status?: string;
}

interface UnitSwitcherProps {
  units: BusinessUnitOption[];
  selectedUnitId: string | null;
  onSelectUnit: (unitId: string | null, unit?: BusinessUnitOption | null) => void;
  isLoading?: boolean;
}

export function UnitSwitcher({
  units,
  selectedUnitId,
  onSelectUnit,
  isLoading = false,
}: UnitSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeUnit = selectedUnitId && selectedUnitId !== 'ALL'
    ? units.find((u) => u.id === selectedUnitId || u.code === selectedUnitId)
    : null;

  const getUnitBadgeColor = (code: string) => {
    switch (code?.toUpperCase()) {
      case 'UEC':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'UNCF':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ACARE':
      case 'AMBULANCE':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#111] hover:bg-[#181818] border border-[#262626] hover:border-slate-600 transition-all text-xs font-medium text-slate-200 shadow-sm"
        title="Switch Business Unit Context"
      >
        <span className="p-1 rounded-lg bg-primary/10 text-primary">
          {activeUnit ? <Building2 className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5" />}
        </span>

        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white">
              {activeUnit ? activeUnit.code : 'All Units'}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                activeUnit ? getUnitBadgeColor(activeUnit.code) : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {activeUnit ? activeUnit.code : 'GLOBAL VIEW'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
            {activeUnit ? activeUnit.name : 'Cross-Unit Aggregation'}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0d0d0d] border border-[#222] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2.5 bg-[#141414] border-b border-[#202020] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Multi-Unit Context</span>
            </div>
            <span className="text-[10px] text-slate-500">{units.length} units available</span>
          </div>

          <div className="p-1.5 max-h-80 overflow-y-auto space-y-1">
            {/* Global All Units Option */}
            <button
              type="button"
              onClick={() => {
                onSelectUnit(null, null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                !activeUnit
                  ? 'bg-primary/10 border border-primary/30 text-white font-semibold'
                  : 'hover:bg-[#161616] text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">All Units</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      GLOBAL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Aggregated metrics & cross-unit data</p>
                </div>
              </div>
              {!activeUnit && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>

            <div className="my-1 border-t border-[#1c1c1c]" />

            {/* Individual Units */}
            {units.map((unit) => {
              const isSelected = activeUnit?.id === unit.id;
              const badgeColor = getUnitBadgeColor(unit.code);

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    onSelectUnit(unit.id, unit);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 text-white font-semibold'
                      : 'hover:bg-[#161616] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#1a1a1a] text-slate-300 border border-[#2a2a2a]">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{unit.code}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${badgeColor}`}>
                          {unit.status || 'ACTIVE'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[170px]">{unit.name}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

