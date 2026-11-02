"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Building, Users, Shield, CheckCircle2, AlertTriangle, 
  Loader2, ArrowRight, CornerDownRight, FileText, Phone, Clock, Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';

interface CrossUnitTransferModalProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  leadName?: string;
  currentUnitName?: string;
}

export function CrossUnitTransferModal({
  leadId,
  isOpen,
  onClose,
  onSuccess,
  leadName,
  currentUnitName,
}: CrossUnitTransferModalProps) {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [reason, setReason] = useState<string>('Customer requested cross-department service assistance');
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch all business units
  useEffect(() => {
    if (!isOpen || !leadId) return;
    setLoadingUnits(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewData(null);

    api.get('/telephony/departments')
      .then((res) => {
        if (res?.departments && Array.isArray(res.departments)) {
          setUnits(res.departments);
          const firstOther = res.departments.find((d: any) => d.name !== currentUnitName);
          if (firstOther) {
            setSelectedUnitId(firstOther.id);
          } else if (res.departments.length > 0) {
            setSelectedUnitId(res.departments[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load business units:', err);
      })
      .finally(() => setLoadingUnits(false));
  }, [isOpen, leadId, currentUnitName]);

  // Load preview whenever selectedUnitId changes
  useEffect(() => {
    if (!leadId || !selectedUnitId) return;
    setLoadingPreview(true);
    setErrorMessage(null);

    api.post(`/telephony/leads/${leadId}/cross-unit-transfer/preview`, {
      destinationUnitId: selectedUnitId,
    })
      .then((res) => {
        setPreviewData(res);
        if (res.eligibleAgents && res.eligibleAgents.length > 0) {
          const avail = res.eligibleAgents.find((a: any) => a.status === 'AVAILABLE');
          setSelectedAgentId(avail ? avail.id : res.eligibleAgents[0].id);
        } else {
          setSelectedAgentId('');
        }
      })
      .catch((err) => {
        console.warn('Failed to load transfer preview:', err);
        setErrorMessage(err.message || 'Could not load transfer preview');
      })
      .finally(() => setLoadingPreview(false));
  }, [leadId, selectedUnitId]);

  const handleExecuteTransfer = async () => {
    if (!leadId || !selectedUnitId) return;
    if (!reason || !reason.trim()) {
      setErrorMessage('Please provide a transfer reason.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const selectedUnitObj = units.find((u) => u.id === selectedUnitId);
      const res = await api.post(`/telephony/leads/${leadId}/cross-unit-transfer`, {
        destUnitId: selectedUnitId,
        destDepartment: selectedUnitObj?.name || 'Destination Unit',
        assignedAgentId: selectedAgentId || undefined,
        reason: reason.trim(),
      });

      if (res?.success) {
        setSuccessMessage(`Lead successfully transferred to ${res.destinationUnit}. Complete historical records retained.`);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete cross-unit lead transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d0d0d] border border-[#222] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1e1e1e] flex items-center justify-between bg-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Cross-Unit Lead Transfer
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
                  Full History Preserved
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Transfer operational ownership across foundations while retaining unified call, note, and conversation history.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f1f1f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current vs Destination Unit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#141414] border border-[#222]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Current Owning Foundation / Unit
              </span>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                {currentUnitName || previewData?.lead?.currentUnit?.name || 'Unassigned'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Lead: <strong className="text-slate-200">{leadName || previewData?.lead?.name || 'Customer'}</strong>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141414] border border-[#222]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Destination Foundation / Unit
              </label>
              {loadingUnits ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                  Loading units...
                </div>
              ) : (
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-[#1b1b1b] border border-[#2c2c2c] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Destination Agent Assignment */}
          <div className="p-4 rounded-xl bg-[#141414] border border-[#222] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Destination Assigned Agent (Optional)
              </label>
              <span className="text-[10px] text-slate-500">
                {previewData?.eligibleAgents?.length || 0} agents eligible
              </span>
            </div>

            {loadingPreview ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                Loading eligible agents...
              </div>
            ) : previewData?.eligibleAgents && previewData.eligibleAgents.length > 0 ? (
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[#1b1b1b] border border-[#2c2c2c] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="">Leave Unassigned in Unit Pool</option>
                {previewData.eligibleAgents.map((ag: any) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name} ({ag.department || 'General'} - {ag.status})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No specific agents found in destination department. Lead will be routed to the unit queue.
              </p>
            )}
          </div>

          {/* Historical Attribution Preview */}
          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Historical Integrity Guarantees</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-slate-400 block">Total Calls</span>
                <strong className="text-white text-sm">{previewData?.historicalSummary?.totalCalls ?? '—'}</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-slate-400 block">Follow-ups</span>
                <strong className="text-white text-sm">{previewData?.historicalSummary?.totalFollowups ?? '—'}</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#141414] border border-[#222]">
                <span className="text-[10px] text-slate-400 block">Past Transfers</span>
                <strong className="text-white text-sm">{previewData?.historicalSummary?.previousTransfers ?? '—'}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              All previous call recordings, AI summaries, Omnichannel messages, and agent notes remain permanently attached to this customer identity and viewable in the historical timeline.
            </p>
          </div>

          {/* Transfer Reason */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Transfer Reason & Notes (Required)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer requires nursing care and home doctor support after consultation..."
              className="w-full bg-[#141414] border border-[#262626] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e1e1e] bg-[#121212] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-[#1a1a1a] hover:bg-[#252525] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteTransfer}
            disabled={submitting || !selectedUnitId || !reason.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Transfer...</span>
              </>
            ) : (
              <>
                <span>Confirm & Transfer Lead</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
