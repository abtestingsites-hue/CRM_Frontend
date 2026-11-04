"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Globe2, Shield } from 'lucide-react';
import { useUnitStore, BusinessUnit } from '@/store/useUnitStore';

export function GlobalUnitSwitcher() {
  const { units, selectedUnitId, selectedUnit, setSelectedUnitId, isLoading, isSuperAdmin, initializeFromAuth } = useUnitStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeFromAuth();
  }, [initializeFromAuth]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only render interactive switcher for Super Admin
  if (!isSuperAdmin) {
    if (selectedUnit) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#111] border border-[#262626] text-xs text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-white">{selectedUnit.code}</span>
        </div>
      );
    }
    return null;
  }

  const getUnitBadgeColor = (code?: string) => {
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
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#121212] hover:bg-[#1a1a1a] border border-[#2a2a2a] hover:border-slate-500 transition-all text-xs font-medium text-slate-200 shadow-sm"
        title="Switch Global Dashboard & CRM Unit Context"
      >
        <span className="p-0.5 rounded text-primary">
          {selectedUnit ? <Building2 className="w-3.5 h-3.5" /> : <Globe2 className="w-3.5 h-3.5 text-emerald-400" />}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="font-bold text-white tracking-wide">
            {selectedUnit ? selectedUnit.code : 'All Units'}
          </span>
          <span
            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
              selectedUnit ? getUnitBadgeColor(selectedUnit.code) : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {selectedUnit ? selectedUnit.code : 'GLOBAL VIEW'}
          </span>
        </div>

        <ChevronDown className={`w-3 h-3 text-slate-400 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#0c0c0c] border border-[#262626] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 bg-[#141414] border-b border-[#202020] flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span>Global Unit Context</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{units.length} units available</span>
          </div>

          <div className="p-1.5 max-h-80 overflow-y-auto space-y-1">
            {/* Global All Units Option */}
            <button
              type="button"
              onClick={() => {
                setSelectedUnitId(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                !selectedUnit
                  ? 'bg-primary/15 border border-primary/40 text-white font-semibold'
                  : 'hover:bg-[#161616] text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">All Units — Global View</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Consolidated cross-unit data & dashboards</p>
                </div>
              </div>
              {!selectedUnit && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>

            <div className="my-1 border-t border-[#1c1c1c]" />

            {/* Individual Units */}
            {units.map((unit) => {
              const isSelected = selectedUnit?.id === unit.id || selectedUnit?.code === unit.code;
              const badgeColor = getUnitBadgeColor(unit.code);

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => {
                    setSelectedUnitId(unit.code || unit.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-primary/15 border border-primary/40 text-white font-semibold'
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

