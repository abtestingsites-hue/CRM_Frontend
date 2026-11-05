"use client";

import React, { useState } from 'react';
import { CheckCircle, Loader2, Calendar, FileText, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface LeadConversionModalProps {
  leadId: string;
  onClose: () => void;
  onSubmit: () => void;
}

export function LeadConversionModal({ leadId, onClose, onSubmit }: LeadConversionModalProps) {
  const [notes, setNotes] = useState('');
  const [sentiment, setSentiment] = useState<'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentPurpose, setAppointmentPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Sentiment & Notes, Step 2: Follow-up info, Step 3: Canonical ERP Enquiry Confirmation
  const [sentimentResult, setSentimentResult] = useState<string | null>(null);
  const [conversionDetails, setConversionDetails] = useState<any>(null);

  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || !sentiment) return;

    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('crm_user');
      const token = localStorage.getItem('paramantra_access_token') || '';
      let agentId = null;
      if (stored) {
        agentId = JSON.parse(stored).agentId;
      }

      // Send conversion payload to backend
      const res = await apiFetch(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes,
          sentiment,
          agentId
        })
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('lead-action-completed', { detail: leadId }));
        const data = await res.json();
        setConversionDetails(data);

        if (data.enquiry) {
          // If ERP Enquiry was created or retrieved, display Canonical ERP Enquiry Confirmation
          setStep(3);
        } else if (data.sentiment === 'POSITIVE') {
          setSentimentResult('POSITIVE');
          setStep(2); // Ask for follow-up details
        } else {
          onSubmit();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error: ${err.error || 'Failed to convert lead'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during conversion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const stored = localStorage.getItem('crm_user');
      let agentId = null;
      if (stored) agentId = JSON.parse(stored).agentId;

      const res = await apiFetch(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes + " (Follow-up scheduled)",
          agentId,
          appointmentDate,
          appointmentPurpose,
          sentiment: 'POSITIVE'
        })
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('lead-action-completed', { detail: leadId }));
        const data = await res.json();
        setConversionDetails(data);
        if (data.enquiry) {
          setStep(3);
        } else {
          onSubmit();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {step === 1 && (
          <>
            <div className="p-8 pb-6 text-center border-b border-[#222] shrink-0">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Convert CRM Lead</h2>
              <p className="text-slate-400 text-sm">Logging customer outcome. Positive outcomes will automatically create an official ERP Enquiry.</p>
            </div>

            <form onSubmit={handleSubmitStep1} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Customer Disposition</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSentiment('POSITIVE')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-colors ${sentiment === 'POSITIVE'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'bg-[#111] border-[#333] text-slate-400 hover:border-[#555]'
                      }`}
                  >
                    Positive (Converted)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSentiment('NEGATIVE')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-colors ${sentiment === 'NEGATIVE'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : 'bg-[#111] border-[#333] text-slate-400 hover:border-[#555]'
                      }`}
                  >
                    Negative (Lost)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Call & Conversion Notes *</label>
                <textarea
                  aria-label="Conversion notes"
                  rows={4}
                  required
                  placeholder="Record customer requirements, service specifications, and key takeaways..."
                  className="w-full bg-[#111] border border-[#333] focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !notes.trim() || !sentiment}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 ${(!notes.trim() || !sentiment)
                    ? 'bg-[#222] text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Processing Conversion...' : 'Convert Lead'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="p-8 pb-6 text-center border-b border-[#222] shrink-0 bg-emerald-950/20">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Calendar className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-emerald-400 mb-2">Schedule Follow-up</h2>
              <p className="text-emerald-500/80 text-sm">Lead converted. Optionally schedule a follow-up appointment in CRM Calendar.</p>
            </div>

            <form onSubmit={handleScheduleFollowUp} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Appointment Date & Time</label>
                <input
                  id="appointment-datetime"
                  aria-label="Appointment Date & Time"
                  type="datetime-local"
                  required
                  className="w-full bg-[#111] border border-[#333] focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-3">Purpose</label>
                <textarea
                  aria-label="Follow up instructions"
                  value={appointmentPurpose}
                  onChange={(e) => setAppointmentPurpose(e.target.value)}
                  placeholder="e.g. Assessment visit / Onboarding confirmation"
                  className="w-full bg-[#111] border border-[#333] focus:border-emerald-500 rounded-xl px-4 py-3 text-sm outline-none text-white transition-colors h-24 resize-none"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Skip Scheduling
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !appointmentDate || !appointmentPurpose}
                  className={`px-6 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 ${(!appointmentDate || !appointmentPurpose)
                    ? 'bg-[#222] text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Scheduling...' : 'Save & Continue'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="p-6 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-center text-white mb-1">ERP Enquiry Generated</h2>
              <p className="text-center text-xs text-slate-400 mb-6">
                {conversionDetails?.alreadyConverted
                  ? 'Lead was already converted. Linked to existing ERP canonical enquiry.'
                  : 'Automatic 1-to-1 sync created the ERP enquiry record successfully.'
                }
              </p>

              <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <span className="text-slate-500 uppercase">ERP Reference No</span>
                  <span className="text-purple-400 font-bold text-sm">
                    {conversionDetails?.enquiry?.refNo || 'ENQ-SYNC-SUCCESS'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <span className="text-slate-500 uppercase">Enquiry Status</span>
                  <span className="text-emerald-400 font-bold">
                    {conversionDetails?.enquiry?.status || 'NEW'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#222]">
                  <span className="text-slate-500 uppercase">Client Profile</span>
                  <span className="text-slate-200">
                    {conversionDetails?.enquiry?.client?.name || conversionDetails?.lead?.customerName || 'Registered'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 uppercase">Cross-Ref ID</span>
                  <span className="text-slate-400 truncate max-w-[180px]">
                    {conversionDetails?.enquiry?.id || leadId}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#222] flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubmit();
                }}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                <span>Done</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
