"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, PhoneForwarded, Users, Building, Shield, CheckCircle2, 
  AlertTriangle, Loader2, PhoneCall, ArrowRight, CornerDownRight 
} from 'lucide-react';
import { api } from '@/lib/api';

interface CallTransferModalProps {
  callSid: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  callerName?: string;
  callerPhone?: string;
}

export function CallTransferModal({
  callSid,
  isOpen,
  onClose,
  onSuccess,
  callerName,
  callerPhone,
}: CallTransferModalProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(true);

  // Form state
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [transferMode, setTransferMode] = useState<'BLIND' | 'ATTENDED'>('BLIND');
  const [reason, setReason] = useState<string>('');

  // Transfer lifecycle state
  const [transferStatus, setTransferStatus] = useState<
    'NOT_STARTED' | 'INITIATED' | 'CONSULTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  >('NOT_STARTED');
  const [transferAuditId, setTransferAuditId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch departments and agents from real API
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMetadata(true);
    setTransferStatus('NOT_STARTED');
    setErrorMessage(null);

    api.get('/telephony/departments')
      .then((res) => {
        if (res?.departments) {
          setDepartments(res.departments);
          if (res.departments.length > 0 && !selectedDept) {
            setSelectedDept(res.departments[0].name);
          }
        }
        if (res?.allAgents) {
          setAllAgents(res.allAgents);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Could not load departments list');
      })
      .finally(() => {
        setLoadingMetadata(false);
      });
  }, [isOpen]);

  // Filter available agents by selected department
  const filteredAgents = allAgents.filter((a) => {
    if (!selectedDept || selectedDept === 'All') return true;
    return a.department?.toLowerCase() === selectedDept.toLowerCase();
  });

  // Automatically select first available agent if available
  useEffect(() => {
    if (filteredAgents.length > 0 && !selectedAgentId) {
      const avail = filteredAgents.find((a) => a.status === 'AVAILABLE');
      if (avail) setSelectedAgentId(avail.id);
      else setSelectedAgentId(filteredAgents[0].id);
    }
  }, [selectedDept, filteredAgents, selectedAgentId]);

  // Handle transfer initiation
  const handleInitiateTransfer = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/telephony/calls/${encodeURIComponent(callSid)}/transfer/initiate`, {
        destinationDepartment: selectedDept,
        destinationAgentId: selectedAgentId || undefined,
        transferMode,
        reason,
      });

      if (res?.success) {
        setTransferAuditId(res.transferAudit?.id || null);
        if (transferMode === 'ATTENDED') {
          setTransferStatus('CONSULTING');
        } else {
          setTransferStatus('COMPLETED');
          setTimeout(() => {
            if (onSuccess) onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        setTransferStatus('FAILED');
        setErrorMessage(res?.message || 'Transfer failed');
      }
    } catch (err: any) {
      setTransferStatus('FAILED');
      setErrorMessage(err.message || 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Complete attended transfer
  const handleCompleteTransfer = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/telephony/calls/${encodeURIComponent(callSid)}/transfer/complete`, {
        transferAuditId,
      });
      if (res?.success) {
        setTransferStatus('COMPLETED');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel attended transfer
  const handleCancelTransfer = async () => {
    setSubmitting(true);
    try {
      await api.post(`/telephony/calls/${encodeURIComponent(callSid)}/transfer/cancel`, {
        transferAuditId,
        reason: 'Cancelled by agent',
      });
      setTransferStatus('CANCELLED');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel transfer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden shadow-2xl text-white relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#1e1e1e] flex items-center justify-between bg-[#121212]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <PhoneForwarded className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Live Call Transfer</h3>
              <p className="text-xs text-slate-400">Shift active customer to department or coordinator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
          {/* Active Caller Card */}
          <div className="p-3.5 bg-[#141414] border border-[#222] rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Active Customer</span>
              <p className="font-bold text-white text-sm">{callerName || 'Connected Caller'}</p>
              <p className="font-mono text-slate-400 text-[11px]">{callerPhone || 'Active Line'}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Transfer State: Completed */}
          {transferStatus === 'COMPLETED' && (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">Call Transferred Successfully</h4>
              <p className="text-xs text-slate-400">
                Customer is now bridged with destination agent.
              </p>
            </div>
          )}

          {/* Transfer State: Consulting (Attended) */}
          {transferStatus === 'CONSULTING' && (
            <div className="p-4 bg-[#141414] border border-cyan-500/30 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Consultation Mode Active</span>
              </div>
              <p className="text-xs text-slate-300">
                Customer is currently placed on hold. You are connected with the destination agent. Confirm to finalize transfer or cancel to resume caller.
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleCompleteTransfer}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Transfer</span>
                </button>
                <button
                  onClick={handleCancelTransfer}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#222] hover:bg-[#333] border border-[#333] text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Consultation</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Form: Not Started */}
          {transferStatus === 'NOT_STARTED' && (
            <>
              {/* Destination Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Destination Department</span>
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setSelectedAgentId('');
                  }}
                  className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id || dept.name} value={dept.name}>
                      {dept.name} ({dept.availableAgents || 0} online)
                    </option>
                  ))}
                  {departments.length === 0 && (
                    <>
                      <option value="Customer Care">Customer Care</option>
                      <option value="Care Management">Care Management</option>
                      <option value="Home Care">Home Care</option>
                      <option value="Ambulance Coordination">Ambulance Coordination</option>
                      <option value="Admissions">Admissions</option>
                    </>
                  )}
                </select>
              </div>

              {/* Destination Agent & Live Presence */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select Destination Agent (Live Presence)</span>
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-[#222] rounded-xl p-2 bg-[#121212] custom-scrollbar">
                  {filteredAgents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">No agents configured in this department</p>
                  ) : (
                    filteredAgents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          selectedAgentId === agent.id
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white'
                            : 'bg-[#161616] border-[#222] text-slate-300 hover:border-[#333]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center font-bold text-[11px] text-slate-300">
                              {agent.name.charAt(0)}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#161616] ${
                              agent.status === 'AVAILABLE'
                                ? 'bg-emerald-400'
                                : agent.status === 'BUSY'
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}></span>
                          </div>
                          <div>
                            <p className="font-semibold">{agent.name}</p>
                            <p className="text-[10px] text-slate-500">{agent.department || 'General'}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            agent.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : agent.status === 'BUSY'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {agent.status}
                          </span>
                          {agent.activeCalls > 0 && (
                            <span className="text-[9px] text-slate-500 block mt-0.5">
                              {agent.activeCalls} active call
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Transfer Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Transfer Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransferMode('BLIND')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      transferMode === 'BLIND'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                        : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">Blind Transfer</span>
                    <span className="text-[10px] text-slate-500 leading-snug block">
                      Instantly hands off customer to destination agent queue
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransferMode('ATTENDED')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      transferMode === 'ATTENDED'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm'
                        : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-bold block mb-0.5">Attended / Consult</span>
                    <span className="text-[10px] text-slate-500 leading-snug block">
                      Holds customer, allows speaking with agent before handoff
                    </span>
                  </button>
                </div>
              </div>

              {/* Optional Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Transfer Reason (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Inquiring about specialized ambulance care or admissions..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500 placeholder-slate-600"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleInitiateTransfer}
                  disabled={submitting || (!selectedDept && !selectedAgentId)}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/20 active:scale-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initiating Transfer...</span>
                    </>
                  ) : (
                    <>
                      <PhoneForwarded className="w-4 h-4" />
                      <span>{transferMode === 'BLIND' ? 'Transfer Call Now' : 'Consult & Transfer'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
