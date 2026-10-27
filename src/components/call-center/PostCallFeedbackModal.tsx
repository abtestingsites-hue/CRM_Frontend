"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Star, CheckCircle, Loader2, Calendar, PhoneOff, PhoneForwarded, AlertCircle, Clock, FileText, Volume2, Play, Pause, Sparkles, Languages, Check, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { CallIntakeFormModal } from './CallIntakeFormModal';

interface PostCallFeedbackModalProps {
  callSid: string;
  onClose: () => void;
  onSubmit: () => void;
  leadId?: string;
}

export function PostCallFeedbackModal({ callSid, onClose, onSubmit, leadId }: PostCallFeedbackModalProps) {
  const [outcome, setOutcome] = useState<'COMPLETED' | 'UNANSWERED' | 'BUSY' | 'FAILED' | 'CANCELLED'>('COMPLETED');
  const [enquiryCategory, setEnquiryCategory] = useState<string>('SERVICE_ENQUIRY');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Resolved']);
  const [followupDate, setFollowupDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Draft Autosave & Recovery State
  const [draftStatus, setDraftStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);

  // Audio Playback & AI Summary in Disposition Modal
  const [intelligence, setIntelligence] = useState<any>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 1. Recover unsaved draft on mount
  useEffect(() => {
    if (!callSid) return;
    try {
      const cached = localStorage.getItem(`draft_notes_${callSid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.outcome) setOutcome(parsed.outcome);
        if (parsed.enquiryCategory) setEnquiryCategory(parsed.enquiryCategory);
        if (parsed.rating) setRating(parsed.rating);
        if (parsed.selectedTags) setSelectedTags(parsed.selectedTags);
        if (parsed.followupDate) setFollowupDate(parsed.followupDate);
        setDraftStatus('SAVED');
      }
    } catch (_) {}
  }, [callSid]);

  // 2. Debounced draft auto-save to backend and localStorage
  useEffect(() => {
    if (!callSid || (!notes && !followupDate && selectedTags.length === 0)) return;
    setDraftStatus('SAVING');
    const timer = setTimeout(async () => {
      const draft = { notes, outcome, enquiryCategory, rating, selectedTags, followupDate };
      try {
        localStorage.setItem(`draft_notes_${callSid}`, JSON.stringify(draft));
        const res = await apiFetch(`/api/v1/telephony/calls/${encodeURIComponent(callSid)}/draft-notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftNotes: draft }),
        });
        if (res.ok) {
          setDraftStatus('SAVED');
          setLastDraftSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          setDraftStatus('FAILED');
        }
      } catch (_) {
        setDraftStatus('FAILED');
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [callSid, notes, outcome, enquiryCategory, rating, selectedTags, followupDate]);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const res = await apiFetch(`/api/v1/analytics/summaries/${callSid}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.recordingUrl) {
            setRecordingUrl(data.recordingUrl);
            if (data.recordingDuration) setAudioDuration(data.recordingDuration);
          }
          if (data.summary) {
            setIntelligence(data);
            // Pre-fill notes if empty and AI summary is available
            setNotes((prev) => prev || data.summary || '');
          }
        }
      } catch (_) {}
    };

    fetchSummary();
    const timer = setTimeout(fetchSummary, 3000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [callSid]);

  const togglePlayAudio = () => {
    if (!audioRef.current || !recordingUrl) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => setIsPlayingAudio(true)).catch(console.error);
    }
  };

  const formatSecs = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const tags = ["Resolved", "Follow-up needed", "Billing", "Technical", "Complaint", "Escalated", "Interested", "Callback requested"];

  const outcomes: Array<{ id: 'COMPLETED' | 'UNANSWERED' | 'BUSY' | 'FAILED' | 'CANCELLED'; label: string; color: string }> = [
    { id: 'COMPLETED', label: 'Completed', color: 'emerald' },
    { id: 'UNANSWERED', label: 'Unanswered', color: 'amber' },
    { id: 'BUSY', label: 'Busy', color: 'purple' },
    { id: 'FAILED', label: 'Failed', color: 'rose' },
    { id: 'CANCELLED', label: 'Cancelled', color: 'slate' },
  ];

  const enquiryCategories = [
    { id: 'SERVICE_ENQUIRY', label: 'Service / Care Enquiry' },
    { id: 'JOB_ENQUIRY', label: 'Employment / Careers' },
    { id: 'COMPLAINT_OR_SUPPORT', label: 'Support / Complaint' },
    { id: 'VOLUNTEER_ENQUIRY', label: 'Volunteer Enquiry' },
    { id: 'DONOR_ENQUIRY', label: 'Donation / CSR' },
    { id: 'GENERAL_ENQUIRY', label: 'General Info' },
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const isFollowupNeeded = selectedTags.includes("Follow-up needed") || selectedTags.includes("Callback requested");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Required completion rules enforcement (Section E)
    if (!notes || notes.trim().length < 5) {
      setErrorMsg('A meaningful interaction summary (min 5 characters) or documented reason no conversation occurred is required.');
      setIsSubmitting(false);
      return;
    }

    if (!enquiryCategory) {
      setErrorMsg('Please select an enquiry category before completing documentation.');
      setIsSubmitting(false);
      return;
    }

    if (isFollowupNeeded && !followupDate) {
      setErrorMsg('Follow-up date & time is required when "Follow-up needed" or "Callback requested" is tagged.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Durable Phase 25 documentation completion endpoint
      const docRes = await apiFetch(`/api/v1/telephony/calls/${encodeURIComponent(callSid)}/complete-documentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: notes.trim(),
          disposition: outcome,
          enquiryCategory,
          csatScore: rating || 3,
          tags: selectedTags,
          followupDate: (isFollowupNeeded && followupDate) ? new Date(followupDate).toISOString() : undefined,
          leadId: leadId || undefined,
        }),
      });

      // 2. Feedback analytics endpoint for compatibility
      await apiFetch(`/api/v1/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSid,
          outcome,
          csatScore: rating || 3,
          tags: selectedTags,
          notes: notes.trim(),
          leadId: leadId || undefined,
          followupDate: (isFollowupNeeded && followupDate) ? new Date(followupDate).toISOString() : undefined,
        }),
      }).catch(() => {});

      if (docRes.ok) {
        // Clear local draft upon confirmed successful submission
        try { localStorage.removeItem(`draft_notes_${callSid}`); } catch (_) {}
        onSubmit();
      } else {
        const errData = await docRes.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Failed to persist call documentation to server.');
      }
    } catch (err: any) {
      console.error('[PostCallFeedbackModal] Error:', err);
      setErrorMsg('Network error while saving call documentation. Draft is preserved locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#222] rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 pb-4 text-center border-b border-[#222] shrink-0">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/30">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Post-Call Documentation</h2>
          <p className="text-slate-400 text-xs">Complete mandatory interaction summary, enquiry category, and disposition.</p>
          
          {/* Draft status indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px]">
            {draftStatus === 'SAVED' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Draft auto-saved {lastDraftSavedAt ? `at ${lastDraftSavedAt}` : ''}
              </span>
            )}
            {draftStatus === 'SAVING' && (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving draft...
              </span>
            )}
            {draftStatus === 'FAILED' && (
              <span className="text-rose-400">Draft saved locally</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Audio Recording & AI Intelligence Review Bar */}
          {(recordingUrl || intelligence) && (
            <div className="bg-[#141519] border border-[#262830] rounded-2xl p-4 space-y-3">
              {recordingUrl && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Call Recording
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formatSecs(audioTime)} / {formatSecs(audioDuration)}
                    </span>
                  </div>
                  <audio
                    ref={audioRef}
                    src={recordingUrl}
                    onTimeUpdate={(e) => setAudioTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      if (e.currentTarget.duration && !isNaN(e.currentTarget.duration)) {
                        setAudioDuration(e.currentTarget.duration);
                      }
                    }}
                    onEnded={() => {
                      setIsPlayingAudio(false);
                      setAudioTime(0);
                    }}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                    >
                      {isPlayingAudio ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max={audioDuration || 1}
                      step="0.1"
                      value={audioTime}
                      onChange={(e) => {
                        const newTime = parseFloat(e.target.value);
                        setAudioTime(newTime);
                        if (audioRef.current) audioRef.current.currentTime = newTime;
                      }}
                      className="flex-1 h-1.5 bg-[#252830] rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                  </div>
                </div>
              )}

              {intelligence?.summary && (
                <div className="pt-2 border-t border-[#22242a] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary" /> AI Summary
                    </span>
                    {intelligence.sentiment && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        intelligence.sentiment === 'Positive' ? 'bg-emerald-500/20 text-emerald-400' :
                        intelligence.sentiment === 'Negative' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {intelligence.sentiment} ({intelligence.sentimentScore || 5}/10)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar p-2 bg-[#0a0b0e] rounded-lg border border-[#1f2128]">
                    {intelligence.summary}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Call Outcome Disposition */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Call Outcome Disposition <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {outcomes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOutcome(item.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center ${
                    outcome === item.id
                      ? 'bg-primary text-white border-primary shadow-sm shadow-primary/30'
                      : 'bg-[#121212] text-slate-400 border-[#252525] hover:border-[#444]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enquiry Category Selection */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Enquiry Category & Intent <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {enquiryCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setEnquiryCategory(cat.id)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all border text-left truncate ${
                    enquiryCategory === cat.id
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-[#121212] text-slate-400 border-[#252525] hover:border-[#444]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* CSAT Rating */}
          <div className="text-center pt-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Customer Satisfaction (CSAT: {rating} / 5)
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Call Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    selectedTags.includes(tag)
                      ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                      : 'bg-[#121212] text-slate-400 border-[#222] hover:border-[#444]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up Date/Time if needed */}
          {isFollowupNeeded && (
            <div className="p-3 bg-[#111] border border-[#252525] rounded-xl space-y-2">
              <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Schedule Callback / Follow-Up <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={followupDate}
                onChange={(e) => setFollowupDate(e.target.value)}
                className="w-full bg-[#181818] border border-[#333] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Mandatory Interaction Summary Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Interaction Summary <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] ${notes.trim().length >= 5 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {notes.trim().length} chars (min 5)
              </span>
            </div>
            <textarea
              aria-label="Call summary feedback"
              rows={3}
              required
              className="w-full bg-[#111] border border-[#252525] focus:border-primary rounded-xl px-4 py-2.5 text-xs text-white outline-none resize-none placeholder:text-slate-600"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record caller requirement, key points discussed, or reason no conversation occurred (required)..."
            />
          </div>

          {/* Action Buttons: Note SKIP BUTTON IS REMOVED per Section E */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#1c1c1c]">
            <button
              type="button"
              onClick={() => setShowIntakeModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Intake Form</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || notes.trim().length < 5 || (isFollowupNeeded && !followupDate)}
              className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-primary text-white hover:bg-orange-600 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSubmitting ? 'Persisting...' : 'Complete Documentation'}
            </button>
          </div>
        </form>
      </div>

      {showIntakeModal && (
        <CallIntakeFormModal
          callSid={callSid}
          leadId={leadId}
          isOpen={showIntakeModal}
          onClose={() => setShowIntakeModal(false)}
          onSuccess={() => {
            setShowIntakeModal(false);
            onSubmit();
          }}
        />
      )}
    </div>
  );
}

