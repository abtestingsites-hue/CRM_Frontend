"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Phone, PhoneIncoming, PhoneOutgoing, Clock, User, Shield, 
  Building, MessageSquare, Play, Calendar, CheckCircle2, AlertTriangle, 
  ArrowRight, FileText, Sparkles, AlertCircle, Share2, CornerDownRight, 
  ExternalLink, Loader2, RefreshCw, History
} from 'lucide-react';
import { api } from '@/lib/api';
import { CrossUnitTransferModal } from '@/components/call-center/CrossUnitTransferModal';

interface CustomerHistoryDrawerProps {
  identifier: string | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadTransferred?: () => void;
}

export function CustomerHistoryDrawer({
  identifier,
  isOpen,
  onClose,
  onLeadTransferred,
}: CustomerHistoryDrawerProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'omnichannel' | 'transfers'>('all');

  // Cross-unit transfer modal
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Load customer intelligence data
  const loadCustomerIntelligence = (idVal: string) => {
    if (!idVal || !idVal.trim()) return;
    setLoading(true);
    setError(null);

    let clean = idVal.trim();
    try {
      clean = decodeURIComponent(clean);
    } catch (_) {}

    api.get(`/telephony/customer-history/${encodeURIComponent(clean)}`)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.warn('Failed to load customer history:', err);
        setError(err.message || 'Failed to resolve customer history');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen || !identifier) {
      setData(null);
      return;
    }
    loadCustomerIntelligence(identifier);
  }, [isOpen, identifier]);

  if (!isOpen) return null;

  const resolved = data?.resolvedCustomer;
  const isEmergency = data?.isEmergency || resolved?.priority === 'EMERGENCY';

  // Filter timeline entries
  const timeline = data?.timeline || [];
  const filteredTimeline = timeline.filter((item: any) => {
    if (activeTab === 'calls') return item.type === 'CALL';
    if (activeTab === 'omnichannel') return item.type === 'CONVERSATION' || item.channel === 'WHATSAPP' || item.channel === 'EMAIL' || item.channel === 'INSTAGRAM';
    if (activeTab === 'transfers') return item.type === 'TRANSFER' || item.type === 'NOTE';
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-2xl bg-[#0a0a0a] border-l border-[#1f1f1f] text-white flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#1a1a1a] bg-[#0c0c0c] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                  isEmergency
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      {resolved?.name || 'Customer Intelligence'}
                    </h2>
                    {isEmergency && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[10px] font-extrabold text-rose-400 uppercase tracking-widest animate-pulse">
                        Ambulance Emergency
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Cross-unit history, prior enquiries, previous services & recordings
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {resolved?.leadId && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-semibold text-orange-400 flex items-center gap-1.5 transition-colors"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Transfer Unit</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  <p className="text-sm">Resolving cross-unit customer identity...</p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Failed to load customer profile</p>
                      <p className="opacity-90">{error}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => identifier && loadCustomerIntelligence(identifier)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {!loading && !error && data && timeline.length === 0 && !resolved?.leadId && (
                <div className="p-6 rounded-2xl bg-[#111] border border-[#222] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No Prior History Records</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    No previous calls, transfers, or omnichannel enquiries are currently on record for{' '}
                    <span className="font-mono text-orange-400">{resolved?.phone || identifier}</span>.
                  </p>
                </div>
              )}

              {!loading && data && (
                <>
                  {/* Identity Summary Card */}
                  <div className="p-4 rounded-2xl bg-[#111] border border-[#222] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1c1c] pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                          Verified Contact
                        </span>
                        <p className="text-sm font-semibold text-white font-mono mt-0.5">
                          {resolved?.phone}
                        </p>
                        {resolved?.email && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {resolved.email}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                          Current Owning Unit
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-400 mt-0.5">
                          <Building className="w-3 h-3" />
                          {resolved?.currentUnit}
                        </span>
                      </div>
                    </div>

                    {/* Stats Strip */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div className="p-2 rounded-xl bg-[#161616]">
                        <span className="text-[10px] text-slate-500 block">Calls</span>
                        <strong className="text-white text-sm">{data?.stats?.totalCalls ?? 0}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#161616]">
                        <span className="text-[10px] text-slate-500 block">Recordings</span>
                        <strong className="text-white text-sm">{data?.stats?.totalRecordings ?? 0}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#161616]">
                        <span className="text-[10px] text-slate-500 block">Omnichannel</span>
                        <strong className="text-white text-sm">{data?.stats?.totalConversations ?? 0}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-[#161616]">
                        <span className="text-[10px] text-slate-500 block">Transfers</span>
                        <strong className="text-white text-sm">{data?.stats?.totalTransfers ?? 0}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Previous Business Units Contacted */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-orange-500" />
                      Previous Business Units Contacted
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {data?.businessUnitsContacted && data.businessUnitsContacted.length > 0 ? (
                        data.businessUnitsContacted.map((bu: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl bg-[#141414] border border-[#262626] text-xs font-semibold text-slate-200"
                          >
                            {bu}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">Only current unit recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Previous Services Requested */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Services Previously Requested
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {data?.requestedServices && data.requestedServices.length > 0 ? (
                        data.requestedServices.map((srv: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400"
                          >
                            {srv}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">General consultation</span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Navigation Tabs */}
                  <div className="border-t border-[#1a1a1a] pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Historical Interaction Timeline
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {filteredTimeline.length} events
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#121212] border border-[#222]">
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeTab === 'all'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveTab('calls')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeTab === 'calls'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Calls
                      </button>
                      <button
                        onClick={() => setActiveTab('omnichannel')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeTab === 'omnichannel'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Omnichannel
                      </button>
                      <button
                        onClick={() => setActiveTab('transfers')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          activeTab === 'transfers'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Transfers
                      </button>
                    </div>

                    {/* Timeline Event List */}
                    <div className="space-y-3">
                      {filteredTimeline.length > 0 ? (
                        filteredTimeline.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl bg-[#111] border border-[#222] hover:border-[#333] transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                  item.type === 'CALL' ? 'bg-emerald-500' :
                                  item.type === 'TRANSFER' ? 'bg-orange-500' :
                                  item.type === 'CONVERSATION' ? 'bg-blue-500' : 'bg-amber-500'
                                }`} />
                                <span className="text-xs font-bold text-white">
                                  {item.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                                {new Date(item.timestamp).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>

                            {item.summary && (
                              <p className="text-xs text-slate-300 leading-relaxed bg-[#161616] p-2.5 rounded-lg border border-[#262626]">
                                <strong className="text-slate-400">Summary: </strong>
                                {item.summary}
                              </p>
                            )}

                            {item.content && (
                              <p className="text-xs text-slate-300 leading-relaxed bg-[#161616] p-2 rounded-lg">
                                {item.content}
                              </p>
                            )}

                            {item.lastMessage && (
                              <p className="text-xs text-slate-400 italic">
                                &quot;{item.lastMessage}&quot;
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-[#1a1a1a]">
                              {item.agent && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  {item.agent}
                                </span>
                              )}
                              {item.department && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-500" />
                                  {item.department}
                                </span>
                              )}
                              {item.duration > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {Math.floor(item.duration / 60)}m {item.duration % 60}s
                                </span>
                              )}
                              {item.recordingAvailable && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                                  Audio Recorded
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-slate-500 text-xs">
                          No events recorded in this category.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#0c0c0c] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Cross-Unit Intelligence &bull; CRM Tool
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1c1c1c] hover:bg-[#282828] transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Unit Transfer Modal */}
      {showTransferModal && resolved?.leadId && (
        <CrossUnitTransferModal
          leadId={resolved.leadId}
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSuccess={() => {
            setShowTransferModal(false);
            if (identifier) loadCustomerIntelligence(identifier);
            if (onLeadTransferred) onLeadTransferred();
          }}
          leadName={resolved.name}
          currentUnitName={resolved.currentUnit}
        />
      )}
    </>
  );
}
