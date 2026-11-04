"use client";

import React, { useEffect, useState } from 'react';
import { useLeadStore } from '@/store/useLeadStore';
import {
  Calendar,
  Phone,
  Activity,
  MoreVertical,
  Building2,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { CallIntakeFormModal } from '@/components/call-center/CallIntakeFormModal';

const KANBAN_COLUMNS = [
  { id: 'NEW', label: 'New', color: 'border-blue-500/50 bg-blue-500/10 text-blue-400', headerBg: 'bg-blue-500/5' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400', headerBg: 'bg-cyan-500/5' },
  { id: 'FOLLOWUP_REQUIRED', label: 'Follow Up', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400', headerBg: 'bg-amber-500/5' },
  { id: 'POSITIVE', label: 'Positive', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', headerBg: 'bg-emerald-500/5' },
  { id: 'CONVERTED', label: 'Converted', color: 'border-purple-500/50 bg-purple-500/10 text-purple-400', headerBg: 'bg-purple-500/5' },
  { id: 'CLOSED', label: 'Closed / Lost', color: 'border-rose-500/50 bg-rose-500/10 text-rose-400', headerBg: 'bg-rose-500/5' },
];

export default function LeadConversionBoard() {
  const { leads, fetchLeads, updateLeadStatus, isLoading } = useLeadStore();
  const [selectedLeadForIntake, setSelectedLeadForIntake] = useState<any | null>(null);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadLeads = () => {
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('paramantra_access_token') || '') : '';
    fetchLeads(token);
  };

  useEffect(() => {
    reloadLeads();
  }, [fetchLeads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('paramantra_access_token') || '') : '';
      await updateLeadStatus(leadId, statusId, 'Moved via Conversion Board', token);
      setToastMessage(`Lead transitioned to ${statusId}`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const getOrganizationBadge = (orgName?: string | null) => {
    const org = (orgName || 'UEC').toUpperCase();
    if (org.includes('UNCF')) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold text-[10px] border border-indigo-500/30">
          UNCF
        </span>
      );
    }
    if (org.includes('ACARE') || org.includes('A_CARE')) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold text-[10px] border border-rose-500/30">
          ACare
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
        UEC
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 bg-[#050505] min-h-screen text-white flex flex-col">
      <div className="h-full flex flex-col space-y-5">
        
        {/* Toast */}
        {toastMessage && (
          <div className="p-3 px-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#222]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Conversion Board</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-semibold">
                Kanban Lifecycle
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Synchronized lead progression across stages. Drag cards or save customer intake dispositions to automatically advance stages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={reloadLeads}
              className="p-2 bg-[#141416] hover:bg-[#1e1e22] text-slate-400 hover:text-white border border-[#222] rounded-xl transition-colors"
              title="Refresh Board"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                setSelectedLeadForIntake(null);
                setIsIntakeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Lead</span>
            </button>
          </div>
        </div>

        {/* Kanban Board Grid */}
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
          {KANBAN_COLUMNS.map(column => {
            const columnLeads = leads.filter(l => {
              if (column.id === 'CLOSED') {
                return l?.status === 'CLOSED' || l?.status === 'NEGATIVE' || l?.status === 'LOST';
              }
              return l?.status === column.id;
            });

            return (
              <div 
                key={column.id}
                className="w-80 shrink-0 flex flex-col bg-[#0d0d0f] border border-[#222] rounded-2xl shadow-xl snap-center"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-[#222] flex items-center justify-between rounded-t-2xl ${column.headerBg}`}>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${column.color}`}>
                    {column.label}
                  </div>
                  <span className="text-xs text-slate-400 font-bold bg-[#141416] px-2 py-0.5 rounded-md border border-[#26262a]">
                    {columnLeads.length}
                  </span>
                </div>
                
                {/* Cards Container */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar min-h-[420px]">
                  {columnLeads.length === 0 ? (
                    <div className="h-36 flex flex-col items-center justify-center text-slate-600 border border-dashed border-[#1f1f23] rounded-xl text-center p-3">
                      <p className="text-xs">No leads in {column.label}</p>
                      <p className="text-[10px] mt-0.5 text-slate-700">Drop cards here to advance</p>
                    </div>
                  ) : (
                    columnLeads.map(lead => (
                      <div 
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => {
                          setSelectedLeadForIntake(lead);
                          setIsIntakeOpen(true);
                        }}
                        className="bg-[#141416] border border-[#222] hover:border-orange-500/50 rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all shadow-md text-white group relative"
                      >
                        {/* Card Header: Customer Name + Org Badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <h4 className="font-bold text-xs text-white group-hover:text-orange-400 transition-colors">
                              {lead.customerName || 'Unknown Customer'}
                            </h4>
                            <p className="text-[11px] text-orange-400/90 font-medium truncate max-w-[190px] mt-0.5" title={lead.primaryService || lead.serviceInterest || 'General Inquiry'}>
                              {lead.primaryService || lead.serviceInterest || 'General Inquiry'}
                            </p>
                          </div>
                          <div>
                            {getOrganizationBadge(lead.foundation || lead.unitName)}
                          </div>
                        </div>

                        {/* Card Body Details */}
                        <div className="space-y-1.5 pt-1 border-t border-[#1e1e22] text-[11px] text-slate-400 font-mono">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{lead.phoneNumber}</span>
                          </div>

                          {lead.patientName && (
                            <div className="text-[10px] text-rose-400/90 font-sans">
                              Patient: <strong className="text-rose-300">{lead.patientName}</strong>
                              {lead.patientWeight ? ` (${lead.patientWeight} ${lead.patientWeightUnit || 'kg'})` : ''}
                            </div>
                          )}

                          {lead.interestLevel && (
                            <div className="text-[10px] font-sans flex items-center gap-1 mt-1">
                              <span className="text-slate-500">Interest:</span>
                              <span className={`px-1.5 py-0.2 rounded font-bold ${
                                lead.interestLevel === 'HIGH' ? 'text-emerald-400 bg-emerald-500/10' :
                                lead.interestLevel === 'LOW' ? 'text-amber-400 bg-amber-500/10' :
                                'text-blue-400 bg-blue-500/10'
                              }`}>
                                {lead.interestLevel}
                              </span>
                            </div>
                          )}

                          {/* Follow-up Badge */}
                          {(lead.followupDate || lead.nextFollowup) && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit font-sans font-semibold mt-1.5">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{new Date(lead.followupDate || lead.nextFollowup || '').toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              {lead.followupTime && <span>• {lead.followupTime}</span>}
                            </div>
                          )}

                          {/* Agent Attribution */}
                          <div className="flex items-center justify-between pt-1 text-[10px] font-sans text-slate-500">
                            <span>{lead.agentName || 'Unassigned'}</span>
                            <span className="text-slate-600">{new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Intake Modal for Lead Details & Editing */}
      {isIntakeOpen && (
        <CallIntakeFormModal
          isOpen={isIntakeOpen}
          onClose={() => {
            setIsIntakeOpen(false);
            setSelectedLeadForIntake(null);
          }}
          leadId={selectedLeadForIntake?.id}
          customerName={selectedLeadForIntake?.customerName}
          phoneNumber={selectedLeadForIntake?.phoneNumber}
          initialData={selectedLeadForIntake}
          onSuccess={() => {
            reloadLeads();
            setToastMessage("Lead record & conversion status updated.");
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
