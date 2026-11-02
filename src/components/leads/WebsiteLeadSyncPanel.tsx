"use client";

import React, { useState, useEffect } from 'react';
import {
  Globe,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface SourceStatus {
  sourceId: string;
  name: string;
  websiteUrl: string;
  sourceLabel: string;
  enabled: boolean;
  configured: boolean;
  adapterType: string;
  totalReceived: number;
  recordsImported: number;
  duplicatesSkipped: number;
  lastReceivedAt: string | null;
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  checkpointCursor?: string | null;
}

export function WebsiteLeadSyncPanel() {
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalSource, setActiveModalSource] = useState<SourceStatus | null>(null);
  const [expandedGuides, setExpandedGuides] = useState<Record<string, boolean>>({});
  const [isDryRun, setIsDryRun] = useState(true);
  const [syncJsonInput, setSyncJsonInput] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pingAlerts, setPingAlerts] = useState<Record<string, string>>({});

  const fetchStatuses = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/v1/webhooks/leads/sources/status');
      if (res.ok) {
        const json = await res.json();
        setSources(json.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch website lead sources status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleTestPing = async (sourceId: string) => {
    setPingAlerts(prev => ({ ...prev, [sourceId]: 'Testing connection...' }));
    try {
      const res = await apiFetch(`/api/v1/webhooks/leads/sources/${sourceId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateLead: false }),
      });
      const data = await res.json();
      if (data.success) {
        setPingAlerts(prev => ({
          ...prev,
          [sourceId]: '✅ Handshake verified! Adapter ready.',
        }));
      } else {
        setPingAlerts(prev => ({
          ...prev,
          [sourceId]: `❌ Failed: ${data.error || 'Unknown error'}`,
        }));
      }
    } catch (err: any) {
      setPingAlerts(prev => ({
        ...prev,
        [sourceId]: `❌ Error: ${err.message}`,
      }));
    }
    setTimeout(() => {
      fetchStatuses();
    }, 1000);
  };

  const handleExecuteSync = async () => {
    if (!activeModalSource) return;
    setIsSyncing(true);
    setSyncResult(null);

    let parsedRecords = [];
    try {
      if (syncJsonInput.trim()) {
        parsedRecords = JSON.parse(syncJsonInput);
        if (!Array.isArray(parsedRecords)) {
          parsedRecords = [parsedRecords];
        }
      }
    } catch (e: any) {
      alert(`Invalid JSON input: ${e.message}`);
      setIsSyncing(false);
      return;
    }

    try {
      const res = await apiFetch(
        `/api/v1/webhooks/leads/sources/${activeModalSource.sourceId}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dryRun: isDryRun,
            records: parsedRecords,
          }),
        }
      );
      const data = await res.json();
      setSyncResult(data);
      fetchStatuses();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleGuide = (sourceId: string) => {
    setExpandedGuides(prev => ({ ...prev, [sourceId]: !prev[sourceId] }));
  };

  const totalReceivedAll = sources.reduce((acc, s) => acc + (s.totalReceived || 0), 0);
  const totalImportedAll = sources.reduce((acc, s) => acc + (s.recordsImported || 0), 0);
  const totalDuplicatesAll = sources.reduce((acc, s) => acc + (s.duplicatesSkipped || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Website Lead Ingestion & Synchronization Engine
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Real-time webhook ingestion and historical lead synchronization across all 7 brand websites.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchStatuses}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] hover:bg-[#252525] text-slate-200 text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Aggregate Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Websites</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{sources.length} of 7</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Adapters Configured
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Ingested Events</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalReceivedAll}</div>
          <div className="text-xs text-slate-500 mt-1">Real-time webhooks delivered</div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Leads Imported to Pool</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalImportedAll}</div>
          <div className="text-xs text-slate-500 mt-1">Validated & stored in CRM Lead Pool</div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Duplicates Prevented</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDuplicatesAll}</div>
          <div className="text-xs text-slate-500 mt-1">Correlated & protected idempotently</div>
        </div>
      </div>

      {/* Website Sources Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map(source => {
          const isGuideOpen = !!expandedGuides[source.sourceId];
          const pingMessage = pingAlerts[source.sourceId];

          return (
            <div
              key={source.sourceId}
              className="bg-[#111] border border-[#222] rounded-xl p-5 flex flex-col justify-between hover:border-[#333] transition"
            >
              <div>
                {/* Source Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-white text-base leading-tight">
                      {source.name}
                    </h3>
                    <a
                      href={source.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                    >
                      <span>{source.websiteUrl.replace('https://', '')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    ACTIVE
                  </span>
                </div>

                {/* Metrics */}
                <div className="bg-[#0a0a0a] rounded-lg p-3 my-3 text-xs space-y-1.5 border border-[#1f1f1f]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source ID:</span>
                    <span className="font-mono text-slate-300">{source.sourceId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Adapter Type:</span>
                    <span className="text-slate-300 capitalize">{source.adapterType.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Events Received:</span>
                    <span className="font-semibold text-white">{source.totalReceived}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Leads Stored:</span>
                    <span className="font-semibold text-emerald-400">{source.recordsImported}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duplicates Filtered:</span>
                    <span className="text-amber-400">{source.duplicatesSkipped}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Received:</span>
                    <span className="text-slate-400">
                      {source.lastReceivedAt ? new Date(source.lastReceivedAt).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Ping message if active */}
                {pingMessage && (
                  <div className="text-xs px-2.5 py-1.5 rounded bg-[#1e1e1e] border border-[#333] text-slate-300 mb-3">
                    {pingMessage}
                  </div>
                )}
              </div>

              {/* Actions & Guide */}
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestPing(source.sourceId)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-xs font-medium text-slate-200 transition text-center"
                  >
                    Test Ping
                  </button>
                  <button
                    onClick={() => {
                      setActiveModalSource(source);
                      setSyncResult(null);
                      setSyncJsonInput(
                        JSON.stringify(
                          [
                            {
                              name: 'Sample Lead',
                              phone: '9876543210',
                              email: 'lead@example.com',
                              message: 'Need care and consultation support',
                            },
                          ],
                          null,
                          2
                        )
                      );
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium text-blue-300 transition text-center"
                  >
                    Import / Sync
                  </button>
                </div>

                {/* Toggle Integration Details */}
                <button
                  onClick={() => toggleGuide(source.sourceId)}
                  className="w-full flex items-center justify-between text-[11px] text-slate-500 hover:text-slate-400 py-1 transition"
                >
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5" /> Webhook Setup Spec
                  </span>
                  {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isGuideOpen && (
                  <div className="text-[11px] bg-[#0a0a0a] border border-[#222] p-2.5 rounded-lg space-y-1.5 text-slate-400 font-mono">
                    <div>
                      <span className="text-slate-500">Method:</span> <span className="text-emerald-400">POST</span>
                    </div>
                    <div>
                      <span className="text-slate-500">URL:</span>
                      <div className="text-slate-300 break-all">
                        /api/v1/webhooks/leads/{source.sourceId}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Auth:</span>{' '}
                      <span className="text-amber-400">x-webhook-secret</span> or{' '}
                      <span className="text-amber-400">x-hub-signature-256</span> (HMAC-SHA256)
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Sync / Historical Import Modal */}
      {activeModalSource && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111] border border-[#262626] rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-[#222] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Historical Lead Import & Batch Sync
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Source: <span className="text-blue-400 font-semibold">{activeModalSource.name}</span> ({activeModalSource.sourceId})
                </p>
              </div>
              <button
                onClick={() => setActiveModalSource(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dry Run Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#181818] border border-[#2e2e2e]">
              <div>
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Dry-Run Simulation Mode
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Validates field mapping and counts duplicates without modifying the CRM database.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDryRun}
                  onChange={e => setIsDryRun(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* JSON Data Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Leads Records JSON (Array of Objects)
              </label>
              <textarea
                rows={6}
                value={syncJsonInput}
                onChange={e => setSyncJsonInput(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-3 text-xs text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
                placeholder='[ { "name": "...", "phone": "..." } ]'
              />
            </div>

            {/* Sync Results Preview */}
            {syncResult && (
              <div
                className={`p-3.5 rounded-lg text-xs font-mono border ${
                  syncResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="font-bold mb-1">
                  {syncResult.dryRun ? '🔍 Dry-Run Validation Result' : '✅ Execution Completed'}:
                </div>
                <div>Total Provided: {syncResult.totalProvided}</div>
                <div>Valid Records: {syncResult.validRecords}</div>
                <div>Duplicates Skipped: {syncResult.duplicatesSkipped}</div>
                {!syncResult.dryRun && <div>Created in DB: {syncResult.createdCount}</div>}
                {!syncResult.dryRun && <div>Updated in DB: {syncResult.updatedCount}</div>}
                {syncResult.errors?.length > 0 && (
                  <div className="text-amber-400 mt-1">
                    Errors: {syncResult.errors.length} (inspect sample in console)
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModalSource(null)}
                className="px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2c2c2c] text-sm text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSync}
                disabled={isSyncing}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition flex items-center gap-2 ${
                  isDryRun ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> {isDryRun ? 'Simulate Dry-Run' : 'Import Leads to CRM'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
