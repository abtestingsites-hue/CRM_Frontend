"use client";

import React, { useState, useEffect } from 'react';
import { X, UserCheck, ShieldAlert, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface SameUnitAgentReassignmentModalProps {
  leadId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadName?: string;
  currentUnitName?: string;
}

export function SameUnitAgentReassignmentModal({
  leadId,
  isOpen,
  onClose,
  onSuccess,
  leadName,
  currentUnitName,
}: SameUnitAgentReassignmentModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [leadDetails, setLeadDetails] = useState<any | null>(null);
  const [eligibleAgents, setEligibleAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !leadId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedAgentId('');
    setReason('');

    api
      .get(`/telephony/leads/${encodeURIComponent(leadId)}/eligible-same-unit-agents`)
      .then((res: any) => {
        if (!isMounted) return;
        if (res && res.success) {
          setLeadDetails(res.lead);
          setEligibleAgents(res.eligibleAgents || []);
        } else {
          setError(res?.message || 'Failed to load eligible agents');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const msg = err.response?.data?.message || err.message || 'Failed to fetch same-unit agents';
        setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, leadId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      setError('Please select an eligible agent from the same unit');
      return;
    }
    if (!reason.trim()) {
      setError('A transfer reason is required before confirming reassignment');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res: any = await api.post(`/telephony/leads/${encodeURIComponent(leadId)}/reassign-agent`, {
        destAgentId: selectedAgentId,
        reason: reason.trim(),
      });

      if (res && res.success) {
        setSuccessMessage(`Lead successfully reassigned to ${res.newAssignedAgent || 'selected agent'}.`);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setError(res?.message || 'Agent reassignment rejected by backend');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Reassignment request failed';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAgentObj = eligibleAgents.find((a) => a.id === selectedAgentId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0e1319] border border-[#233342] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2936] bg-[#121921]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Same-Unit Agent Reassignment</h2>
              <p className="text-xs text-slate-400">Transfer lead ownership to another agent within the same unit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2d3d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <p className="text-xs">Loading eligible same-unit agents...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Assignment Overview */}
              <div className="p-3.5 rounded-xl bg-[#141d27] border border-[#233342] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Assignment</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lead / Customer</span>
                    <strong className="text-white truncate block">{leadDetails?.name || leadName || 'Lead Record'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Organization / Unit</span>
                    <strong className="text-orange-400 truncate block">{leadDetails?.unitName || currentUnitName || 'UEC Care'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Assigned Agent</span>
                    <span className="text-slate-200 truncate block">
                      {leadDetails?.currentAssignedAgent?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Department</span>
                    <span className="text-slate-300 truncate block">
                      {leadDetails?.currentAssignedAgent?.department || 'General'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Destination Agent Selection (Strictly Same Unit) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Reassign to Agent (Same Unit Only) *</span>
                  <span className="text-[11px] text-slate-500">{eligibleAgents.length} eligible</span>
                </label>
                {eligibleAgents.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#141d27] border border-[#233342] text-xs text-slate-400 italic">
                    No other active agents found in this unit.
                  </div>
                ) : (
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    required
                    className="w-full bg-[#121b24] border border-[#233342] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">-- Choose destination agent --</option>
                    {eligibleAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.department || 'Agent'} - {ag.status || 'Active'})
                      </option>
                    ))}
                  </select>
                )}
                {selectedAgentObj && (
                  <p className="text-[11px] text-blue-400 flex items-center gap-1 mt-1">
                    <ArrowRight className="w-3 h-3" />
                    <span>Assigned to: {selectedAgentObj.name} ({selectedAgentObj.email || selectedAgentObj.department})</span>
                  </p>
                )}
              </div>

              {/* Transfer Reason (Required) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Transfer Reason (Mandatory) *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this lead is being reassigned (e.g. specialized medical assessment, shift change, customer request)..."
                  required
                  rows={3}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1c2936]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#141d27] hover:bg-[#1c2936] text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedAgentId || !reason.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reassigning...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Confirm Reassignment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

