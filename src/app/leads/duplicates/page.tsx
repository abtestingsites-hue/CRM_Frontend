"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CopyCheck, Search, Filter, RefreshCw, AlertTriangle, 
  CheckCircle2, XCircle, ArrowRight, GitMerge, User, 
  Phone, Mail, Building, Clock, Shield, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/Sidebar';

export default function DuplicateLeadsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);

  // Active merge modal
  const [activeReviewForMerge, setActiveReviewForMerge] = useState<any | null>(null);
  const [mergeReason, setMergeReason] = useState('Confirmed duplicate contact');
  const [isMerging, setIsMerging] = useState(false);

  const loadDuplicateReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any[]>('/leads/duplicates');
      if (Array.isArray(res)) {
        setReviews(res);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load duplicate lead reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDuplicateReviews();
  }, [loadDuplicateReviews]);

  // Scan lead pool for duplicates
  const handleScanDuplicates = async () => {
    setIsScanning(true);
    setError(null);
    setActionSuccess(null);
    try {
      const res = await api.post('/leads/duplicates/scan');
      setActionSuccess(`Scan complete: Evaluated ${res?.scanned || 0} leads and identified ${res?.duplicatesFound || 0} duplicate review pairs.`);
      loadDuplicateReviews();
    } catch (err: any) {
      setError(err.message || 'Duplicate scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Mark as separate people (reject duplicate review)
  const handleMarkSeparate = async (reviewId: string) => {
    try {
      await api.post(`/leads/duplicates/${reviewId}/resolve`, {
        status: 'REJECTED',
        notes: 'Agent verified these represent separate individuals.',
      });
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setActionSuccess('Marked candidate pair as separate people.');
    } catch (err: any) {
      setError(err.message || 'Failed to update review status');
    }
  };

  // Execute safe transactional merge
  const handleExecuteMerge = async () => {
    if (!activeReviewForMerge) return;
    setIsMerging(true);
    setError(null);
    try {
      const res = await api.post('/leads/duplicates/merge', {
        primaryLeadId: activeReviewForMerge.primaryLead.id,
        duplicateLeadId: activeReviewForMerge.duplicateLead.id,
        reason: mergeReason,
      });

      if (res?.success) {
        setActionSuccess(`Successfully merged duplicate lead into primary record (${activeReviewForMerge.primaryLead.name}). All call sessions and conversations reassigned.`);
        setReviews(prev => prev.filter(r => r.id !== activeReviewForMerge.id));
        setActiveReviewForMerge(null);
      }
    } catch (err: any) {
      setError(err.message || 'Safe merge failed');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#070707]">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[#1a1a1a] bg-[#090909] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <CopyCheck className="w-5 h-5 text-orange-500" />
              Lead Duplicate Detection & Resolution
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Layered E.164 phone and email normalization, non-destructive safe merges, and audit retention
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScanDuplicates}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-semibold text-orange-400 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Pool...' : 'Scan for Duplicates'}</span>
            </button>
            <button
              onClick={() => loadDuplicateReviews()}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-[#141414] hover:bg-[#202020] border border-[#262626] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Action Banners */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400/80 hover:text-emerald-300 text-xs">Dismiss</button>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400/80 hover:text-red-300 text-xs">Dismiss</button>
          </div>
        )}

        {/* Reviews Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400">Loading duplicate review candidates...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="h-64 border border-[#1e1e1e] rounded-2xl bg-[#0b0b0b] flex flex-col items-center justify-center gap-2 text-center p-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/75 mb-1" />
              <h3 className="text-sm font-bold text-white">No Unresolved Duplicates</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                All leads have unique normalized phone numbers and emails. Click &quot;Scan for Duplicates&quot; to perform an in-depth match scan across the database.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Identified <strong className="text-white">{reviews.length}</strong> possible duplicate pairs</span>
                <span>Sorted by confidence score</span>
              </div>

              {reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="p-5 bg-[#0e0e0e] border border-[#1e1e1e] rounded-2xl shadow-lg hover:border-[#2a2a2a] transition-all space-y-4"
                >
                  {/* Top Header of Card */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#181818]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        review.confidenceScore >= 90
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : review.confidenceScore >= 70
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {review.confidenceScore}% Confidence Match
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Matching fields:</span>
                        {review.matchingFields?.map((f: string) => (
                          <span key={f} className="text-[10px] bg-[#1a1a1a] text-slate-300 px-2 py-0.5 rounded font-mono border border-[#2a2a2a]">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkSeparate(review.id)}
                        className="px-3 py-1.5 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2a2a2a] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Separate People</span>
                      </button>
                      <button
                        onClick={() => setActiveReviewForMerge(review)}
                        className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                      >
                        <GitMerge className="w-3.5 h-3.5" />
                        <span>Merge Records</span>
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Primary Lead */}
                    <div className="p-4 bg-[#141414] border border-[#222] rounded-xl space-y-2.5 relative">
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Primary Record (Will Keep)
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-orange-400" />
                          {review.primaryLead.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {review.primaryLead.phone}
                        </p>
                        {review.primaryLead.email && (
                          <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {review.primaryLead.email}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e1e1e] text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500 block">Foundation:</span>
                          <span className="text-slate-200 font-semibold">{review.primaryLead.foundation || 'General'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Service:</span>
                          <span className="text-slate-200 font-semibold truncate block">{review.primaryLead.primaryService || 'General Service'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Assigned Agent:</span>
                          <span className="text-slate-200 font-semibold">{review.primaryLead.assignedAgent}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Activity / Calls:</span>
                          <span className="text-slate-200 font-semibold">
                            {review.primaryLead.callCount} calls • {review.primaryLead.followupCount} followups
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Potential Duplicate Lead */}
                    <div className="p-4 bg-[#141414] border border-[#222] rounded-xl space-y-2.5 relative">
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        Duplicate Candidate
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          {review.duplicateLead.name}
                        </h4>
                        <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {review.duplicateLead.phone}
                        </p>
                        {review.duplicateLead.email && (
                          <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {review.duplicateLead.email}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1e1e1e] text-[11px] text-slate-400">
                        <div>
                          <span className="text-slate-500 block">Foundation:</span>
                          <span className="text-slate-200 font-semibold">{review.duplicateLead.foundation || 'General'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Service:</span>
                          <span className="text-slate-200 font-semibold truncate block">{review.duplicateLead.primaryService || 'General Service'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Assigned Agent:</span>
                          <span className="text-slate-200 font-semibold">{review.duplicateLead.assignedAgent}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Activity / Calls:</span>
                          <span className="text-slate-200 font-semibold">
                            {review.duplicateLead.callCount} calls • {review.duplicateLead.followupCount} followups
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Safe Merge Modal */}
      {activeReviewForMerge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0e0e0e] border border-[#222] rounded-2xl overflow-hidden shadow-2xl text-white">
            <div className="p-5 border-b border-[#1e1e1e] flex items-center justify-between bg-[#121212]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Confirm Safe Lead Merge</h3>
                  <p className="text-xs text-slate-400">Non-destructive merge into primary lead</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReviewForMerge(null)}
                className="w-8 h-8 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">What happens during this merge:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-orange-300/90">
                    <li>Primary record <strong>{activeReviewForMerge.primaryLead.name}</strong> will be preserved.</li>
                    <li>All call logs, conversations, follow-ups, and notes from <strong>{activeReviewForMerge.duplicateLead.name}</strong> will be reassigned to the primary record.</li>
                    <li>Any empty primary fields will be backfilled from duplicate data non-destructively.</li>
                    <li>Duplicate lead is archived and soft-merged with full rollback snapshot preserved.</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Merge Audit Reason</label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleExecuteMerge}
                  disabled={isMerging}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <GitMerge className="w-4 h-4" />
                  <span>{isMerging ? 'Merging in Database...' : 'Confirm & Merge Records'}</span>
                </button>
                <button
                  onClick={() => setActiveReviewForMerge(null)}
                  disabled={isMerging}
                  className="px-4 py-3 rounded-xl bg-[#1e1e1e] hover:bg-[#262626] border border-[#333] text-slate-300 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
