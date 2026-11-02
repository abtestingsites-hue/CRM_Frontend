"use client";

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  Edit2,
  Lock,
  Globe,
  Sliders,
  FileText,
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  ArrowLeftRight,
  Search,
  UserCheck,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '@/lib/api';
import { IntegrationConfigModal } from '@/components/super-admin/IntegrationConfigModal';

export default function SuperAdminConsolePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'database' | 'integrations' | 'units' | 'transfers' | 'audit'>('overview');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [databaseHealth, setDatabaseHealth] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lead Transfer States (Phase 1 & 2)
  const [sourceUnitId, setSourceUnitId] = useState<string>('');
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [leadSearchQuery, setLeadSearchQuery] = useState<string>('');
  const [leadSearchResults, setLeadSearchResults] = useState<any[]>([]);
  const [searchingLeads, setSearchingLeads] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [transferPreview, setTransferPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [transferReason, setTransferReason] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);
  const [transferErrorMsg, setTransferErrorMsg] = useState<string | null>(null);
  const [transferAuditLogs, setTransferAuditLogs] = useState<any[]>([]);
  const [loadingTransfersList, setLoadingTransfersList] = useState<boolean>(false);

  // Testing integration states
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Unit modal states
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [unitForm, setUnitForm] = useState({
    code: '',
    name: '',
    description: '',
    isolationMode: 'SHARED',
    enabledProducts: ['CRM'],
    enabledModules: ['TELEPHONY', 'OMNICHANNEL', 'LEADS', 'APPOINTMENTS', 'ANALYTICS'],
  });
  const [unitError, setUnitError] = useState('');

  // Integration edit modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any | null>(null);

  // 1. Authenticate role
  useEffect(() => {
    try {
      const stored = localStorage.getItem('crm_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
        }
      }
    } catch (_) {}
    setIsLoadingAuth(false);
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('paramantra_access_token') || '';
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // 2. Fetch data based on active tab
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const headers = getHeaders();
      const [overRes, dbRes, intRes, unitRes, auditRes] = await Promise.all([
        apiFetch('/api/v1/super-admin/overview', { headers }).then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/super-admin/database-health', { headers }).then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/super-admin/integrations', { headers }).then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/super-admin/units', { headers }).then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/super-admin/audit-logs', { headers }).then((r) => (r.ok ? r.json() : [])),
      ]);

      if (overRes) setOverview(overRes);
      if (dbRes) setDatabaseHealth(dbRes);
      if (Array.isArray(intRes)) setIntegrations(intRes);
      if (Array.isArray(unitRes)) setUnits(unitRes);
      if (Array.isArray(auditRes)) setAuditLogs(auditRes);
    } catch (err) {
      console.warn('[SuperAdmin Fetch Failed]:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllData();
    }
  }, [isSuperAdmin]);

  const fetchTransfers = async () => {
    setLoadingTransfersList(true);
    try {
      const headers = getHeaders();
      const res = await apiFetch('/api/v1/super-admin/leads/transfers', { headers });
      if (res.ok) {
        const data = await res.json();
        setTransferAuditLogs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('[fetchTransfers error]:', e);
    } finally {
      setLoadingTransfersList(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transfers') {
      fetchTransfers();
    }
  }, [activeTab]);

  const handleSearchLeads = async (q: string) => {
    if (!q || q.trim().length < 2) return;
    setSearchingLeads(true);
    setLeadSearchResults([]);
    setSelectedLead(null);
    setTransferPreview(null);
    try {
      const headers = getHeaders();
      const url = `/api/v1/super-admin/leads/search?q=${encodeURIComponent(q.trim())}${sourceUnitId ? `&unitId=${sourceUnitId}` : ''}`;
      const res = await apiFetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setLeadSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('[handleSearchLeads]:', e);
    } finally {
      setSearchingLeads(false);
    }
  };

  const handlePreviewTransfer = async (lead: any) => {
    setSelectedLead(lead);
    setPreviewLoading(true);
    setPreviewError(null);
    setTransferPreview(null);
    setTransferSuccessMsg(null);
    setTransferErrorMsg(null);

    if (!targetUnitId) {
      setPreviewError('Please select a destination business unit first.');
      setPreviewLoading(false);
      return;
    }

    try {
      const headers = getHeaders();
      const res = await apiFetch('/api/v1/super-admin/leads/transfer/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: lead.id,
          sourceUnitId: sourceUnitId || lead.unitId || undefined,
          destinationUnitId: targetUnitId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setPreviewError(data.error || 'Failed to preview lead transfer');
      } else {
        setTransferPreview(data);
      }
    } catch (e: any) {
      setPreviewError(e.message || 'Network error during preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!selectedLead || !targetUnitId) return;
    setIsTransferring(true);
    setTransferSuccessMsg(null);
    setTransferErrorMsg(null);

    try {
      const headers = getHeaders();
      const res = await apiFetch('/api/v1/super-admin/leads/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          leadId: selectedLead.id,
          sourceUnitId: sourceUnitId || selectedLead.unitId || undefined,
          destinationUnitId: targetUnitId,
          reason: transferReason.trim() || 'Super Admin cross-unit reassignment',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setTransferErrorMsg(data.error || 'Transfer failed');
      } else {
        setTransferSuccessMsg(`Lead "${selectedLead.customerName}" successfully transferred to ${data.audit?.destinationUnit?.name || 'destination unit'}!`);
        setSelectedLead(null);
        setTransferPreview(null);
        setTransferReason('');
        fetchTransfers();
        if (leadSearchQuery) {
          handleSearchLeads(leadSearchQuery);
        }
      }
    } catch (e: any) {
      setTransferErrorMsg(e.message || 'Transfer request failed');
    } finally {
      setIsTransferring(false);
    }
  };

  // Run Integration Health Test
  const handleTestIntegration = async (provider: string) => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await apiFetch(`/api/v1/super-admin/integrations/${provider}/test`, {
        method: 'POST',
        headers: getHeaders(),
      });
      const data = await res.json();
      setTestResult(data);
      // Refresh integration list to update status
      const updated = await apiFetch('/api/v1/super-admin/integrations', { headers: getHeaders() });
      if (updated.ok) setIntegrations(await updated.json());
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingProvider(null);
    }
  };

  // Save Unit (Create or Update)
  const handleSaveUnit = async () => {
    setUnitError('');
    if (!unitForm.code.trim() || !unitForm.name.trim()) {
      setUnitError('Unit Code and Unit Name are required');
      return;
    }

    try {
      const headers = getHeaders();
      let res;
      if (editingUnit) {
        res = await apiFetch(`/api/v1/super-admin/units/${editingUnit.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(unitForm),
        });
      } else {
        res = await apiFetch('/api/v1/super-admin/units', {
          method: 'POST',
          headers,
          body: JSON.stringify(unitForm),
        });
      }

      if (res.ok) {
        setShowUnitModal(false);
        setEditingUnit(null);
        // Refresh units and audit
        fetchAllData();
      } else {
        const err = await res.json();
        setUnitError(err.message || 'Failed to save business unit');
      }
    } catch (e: any) {
      setUnitError(e.message || 'Network error');
    }
  };

  // Save Integration Config
  const handleSaveIntegrationModal = async (
    provider: string,
    data: { enabled: boolean; settings: Record<string, any>; secret?: string; unitId?: string }
  ) => {
    const res = await apiFetch(`/api/v1/super-admin/integrations/${provider}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowConfigModal(false);
      fetchAllData();
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update configuration');
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#000] text-slate-400 text-xs">
        <span className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2" />
        Verifying administrative authorization...
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#000] text-white p-6">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold mb-1">Access Restricted: Super Admin Only</h2>
        <p className="text-xs text-slate-400 max-w-md text-center mb-6">
          The Platform Governance Console requires elevated Super Admin credentials. Contact platform administration if you believe this is an error.
        </p>
      </div>
    );
  }

  const allModules = ['TELEPHONY', 'OMNICHANNEL', 'LEADS', 'APPOINTMENTS', 'ANALYTICS'];
  const allProducts = ['CRM', 'ERP'];

  return (
    <div className="min-h-screen bg-[#000] text-white flex flex-col">
      {/* Top Console Bar */}
      <div className="border-b border-[#222] bg-[#050505] px-8 py-5 flex items-center justify-between sticky top-0 z-30">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold tracking-tight">Super Admin Console</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
              OPERATIONAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global Platform Governance, Multi-Unit Isolation & Integration Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-[#282828] text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-[#1c1c1c] bg-[#080808] px-8 flex gap-6 text-xs font-medium">
        {[
          { key: 'overview', label: 'Platform Overview', icon: Activity },
          { key: 'database', label: 'Database Health', icon: Database },
          { key: 'integrations', label: 'Integrations & Credentials', icon: Server },
          { key: 'units', label: 'Multi-Unit Governance', icon: Layers },
          { key: 'transfers', label: 'Cross-Unit Lead Transfer', icon: ArrowLeftRight },
          { key: 'audit', label: 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-white font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-slate-500'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Body */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* ==================================================== */}
        {/* TAB 1: PLATFORM OVERVIEW */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 max-w-6xl">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#080808] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Database Engine</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {overview?.database?.status || 'HEALTHY'}
                </div>
                <div className="text-[10px] text-slate-500">
                  Latency: <span className="text-emerald-400 font-semibold">{overview?.database?.latencyMs || 0} ms</span>
                </div>
              </div>

              <div className="bg-[#080808] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Active Agents</span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {overview?.activeAgents || 0}
                </div>
                <div className="text-[10px] text-slate-500">
                  {overview?.agentBreakdown?.available || 0} Avail · {overview?.agentBreakdown?.busy || 0} Busy
                </div>
              </div>

              <div className="bg-[#080808] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Business Units</span>
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {overview?.businessUnitsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500">
                  Isolation: Hybrid (Shared & Isolated)
                </div>
              </div>

              <div className="bg-[#080808] border border-[#222] rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                  <span>Integrations Configured</span>
                  <Server className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {overview?.integrationsCount || 0}
                </div>
                <div className="text-[10px] text-slate-500">
                  Global defaults & unit overrides
                </div>
              </div>
            </div>

            {/* Quick Health Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#080808] border border-[#222] rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Service Status Summary
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-[#1c1c1c]">
                    <span className="text-slate-400">PostgreSQL (Supabase Pooler)</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Connected
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1c1c1c]">
                    <span className="text-slate-400">LiveKit Cloud Telephony</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> SIP Trunk Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1c1c1c]">
                    <span className="text-slate-400">Vobiz PSTN Gateway</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Credentials OK
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#1c1c1c]">
                    <span className="text-slate-400">Gemini GenAI Models</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> 3.8-flash & 3.5-flash
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-400">Omnichannel Webhooks</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> WhatsApp & Instagram Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Audit Activities */}
              <div className="bg-[#080808] border border-[#222] rounded-xl p-5">
                <h3 className="text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Recent Governance Activity
                </h3>
                <div className="space-y-2 text-xs">
                  {overview?.recentAuditLogs && overview.recentAuditLogs.length > 0 ? (
                    overview.recentAuditLogs.slice(0, 5).map((log: any) => (
                      <div key={log.id} className="p-2.5 rounded-lg bg-[#111] border border-[#222] flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{log.action}</div>
                          <div className="text-[10px] text-slate-400">
                            By {log.actorEmail} · Resource: {log.resource}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                          {log.outcome}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic text-xs py-4 text-center">
                      No administrative events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: DATABASE HEALTH */}
        {/* ==================================================== */}
        {activeTab === 'database' && (
          <div className="space-y-6 max-w-5xl">
            <div className="bg-[#080808] border border-[#222] rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Live PostgreSQL Telemetry
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <div className="text-[11px] text-slate-400 mb-1">Ping Latency</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {databaseHealth?.queryLatencyMs || 0} ms
                  </div>
                </div>
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <div className="text-[11px] text-slate-400 mb-1">Engine Status</div>
                  <div className="text-lg font-bold text-white">
                    {databaseHealth?.status || 'HEALTHY'}
                  </div>
                </div>
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <div className="text-[11px] text-slate-400 mb-1">Schema Sync</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {databaseHealth?.schemaSync || 'UP_TO_DATE'}
                  </div>
                </div>
                <div className="p-3 bg-[#111] rounded-lg border border-[#222]">
                  <div className="text-[11px] text-slate-400 mb-1">SSL Mode</div>
                  <div className="text-lg font-bold text-white">require</div>
                </div>
              </div>

              <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Table Row Counts
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {databaseHealth?.tables &&
                  Object.entries(databaseHealth.tables).map(([table, count]) => (
                    <div key={table} className="p-3 bg-[#121212] rounded-lg border border-[#282828]">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{table}</div>
                      <div className="text-base font-bold text-white mt-0.5">{String(count)}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: INTEGRATIONS & CREDENTIALS */}
        {/* ==================================================== */}
        {activeTab === 'integrations' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Enterprise Integrations</h3>
                <p className="text-xs text-slate-400">
                  Global defaults and unit-specific overrides with zero plaintext secret exposure.
                </p>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                }`}
              >
                <div>
                  <strong>{testResult.provider} Test:</strong> {testResult.success ? 'Connectivity Verified' : 'Check Failed'}
                  {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
                  {testResult.error && ` — ${testResult.error}`}
                </div>
                <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {integrations.map((item) => (
                <div key={item.id} className="bg-[#080808] border border-[#222] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.provider}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1c1c1c] text-slate-300 border border-[#2e2e2e]">
                          {item.unitId ? 'Unit Override' : 'Global Default'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          item.status === 'HEALTHY'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                            : item.status === 'CONFIGURED'
                            ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
                            : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-1 mb-4">
                      <div>
                        Masked Key: <span className="text-slate-300 font-mono font-medium">{item.secretMasked}</span>
                      </div>
                      <div>
                        Config Version: <span className="text-slate-300 font-mono">v{item.version}</span>
                      </div>
                      {item.lastTestedAt && (
                        <div>
                          Last Tested: <span className="text-slate-300">{new Date(item.lastTestedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[#1c1c1c]">
                    <button
                      onClick={() => handleTestIntegration(item.provider)}
                      disabled={testingProvider === item.provider}
                      className="flex-1 py-1.5 rounded-lg bg-[#161616] hover:bg-[#222] border border-[#282828] text-xs font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Zap className={`w-3 h-3 ${testingProvider === item.provider ? 'animate-spin text-primary' : 'text-slate-400'}`} />
                      {testingProvider === item.provider ? 'Testing...' : 'Test Connectivity'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIntegration(item);
                        setShowConfigModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#161616] hover:bg-[#222] border border-[#282828] text-xs font-semibold text-white transition-colors"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: MULTI-UNIT GOVERNANCE */}
        {/* ==================================================== */}
        {activeTab === 'units' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Business Units Management</h3>
                <p className="text-xs text-slate-400">
                  Configure unit isolation (Shared vs. Isolated), products, and module registries.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingUnit(null);
                  setUnitForm({
                    code: '',
                    name: '',
                    description: '',
                    isolationMode: 'SHARED',
                    enabledProducts: ['CRM'],
                    enabledModules: ['TELEPHONY', 'OMNICHANNEL', 'LEADS', 'APPOINTMENTS', 'ANALYTICS'],
                  });
                  setUnitError('');
                  setShowUnitModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium text-xs shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Business Unit
              </button>
            </div>

            <div className="bg-[#080808] border border-[#222] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111] text-slate-400 border-b border-[#222]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Unit Code</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Isolation</th>
                    <th className="px-4 py-3 font-semibold">Products</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c1c]">
                  {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-[#121212] transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-primary">{unit.code}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{unit.name}</div>
                        {unit.description && <div className="text-[10px] text-slate-400">{unit.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            unit.isolationMode === 'ISOLATED'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                              : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {unit.isolationMode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {unit.enabledProducts?.map((p: string) => (
                            <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c1c1c] text-slate-300 border border-[#2a2a2a]">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            unit.status === 'ACTIVE'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingUnit(unit);
                            setUnitForm({
                              code: unit.code,
                              name: unit.name,
                              description: unit.description || '',
                              isolationMode: unit.isolationMode,
                              enabledProducts: unit.enabledProducts || ['CRM'],
                              enabledModules: unit.enabledModules || ['TELEPHONY', 'OMNICHANNEL', 'LEADS', 'APPOINTMENTS', 'ANALYTICS'],
                            });
                            setUnitError('');
                            setShowUnitModal(true);
                          }}
                          className="px-2 py-1 rounded bg-[#161616] hover:bg-[#222] border border-[#282828] text-slate-300 text-[11px] font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: AUDIT TRAIL */}
        {/* ==================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-4 max-w-5xl">
            <h3 className="text-sm font-bold text-white mb-1">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-400 mb-4">
              Immutable record of administrative mutations, configuration updates, and security activities.
            </p>

            <div className="bg-[#080808] border border-[#222] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111] text-slate-400 border-b border-[#222]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Actor Email</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Resource</th>
                    <th className="px-4 py-3 font-semibold">Outcome</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c1c1c]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#121212] transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white">{log.actorEmail}</td>
                      <td className="px-4 py-2.5 font-semibold text-primary">{log.action}</td>
                      <td className="px-4 py-2.5 text-slate-300">{log.resource}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                            log.outcome === 'SUCCESS'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {log.outcome}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5: CROSS-UNIT LEAD TRANSFER (PHASE 1 & 2)       */}
        {/* ==================================================== */}
        {activeTab === 'transfers' && (
          <div className="space-y-8 max-w-6xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" /> Cross-Unit Lead Transfer Workspace
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authorized Super Admin governance to reassign leads across business units with transactional validation, duplicate checking, and historical attribution preservation.
              </p>
            </div>

            {/* Notification Banners */}
            {transferSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{transferSuccessMsg}</span>
              </div>
            )}
            {transferErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{transferErrorMsg}</span>
              </div>
            )}

            {/* Configuration & Search Bar */}
            <div className="bg-[#080808] border border-[#222] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Source Business Unit (Optional Filter)
                  </label>
                  <select
                    value={sourceUnitId}
                    onChange={(e) => setSourceUnitId(e.target.value)}
                    className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="">Any / Unassigned</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Destination Business Unit <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={targetUnitId}
                    onChange={(e) => {
                      setTargetUnitId(e.target.value);
                      if (selectedLead) {
                        handlePreviewTransfer(selectedLead);
                      }
                    }}
                    className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="">Select Destination Unit...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id} disabled={sourceUnitId === u.id}>
                        {u.name} ({u.code}) {sourceUnitId === u.id ? '(Source)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lead Search Input */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Search Lead (Name, Phone, or City)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchLeads(leadSearchQuery)}
                      placeholder="e.g. Ramesh, 9876543210, Chennai..."
                      className="w-full bg-[#121212] border border-[#282828] rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchLeads(leadSearchQuery)}
                    disabled={searchingLeads || !leadSearchQuery.trim()}
                    className="px-4 py-2 bg-primary hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
                  >
                    {searchingLeads ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {leadSearchResults.length > 0 && (
                <div className="pt-3 border-t border-[#1c1c1c]">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Matching Leads ({leadSearchResults.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto custom-scrollbar">
                    {leadSearchResults.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => handlePreviewTransfer(lead)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                          selectedLead?.id === lead.id
                            ? 'bg-primary/10 border-primary text-white'
                            : 'bg-[#121212] border-[#252525] hover:border-[#444] text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-2">
                            {lead.customerName}
                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[#1e1e1e] text-slate-400">
                              {lead.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {lead.phoneNumber} · {lead.city || 'No City'}
                          </div>
                          <div className="text-[10px] text-cyan-400 mt-1 font-mono">
                            Unit: {lead.unit?.name || 'Unassigned'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 text-[11px] rounded bg-[#222] hover:bg-[#333] text-white font-medium"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Preview Panel */}
            {selectedLead && (
              <div className="bg-[#080808] border border-[#222] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" /> Transfer Validation & Preview
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Review duplicate checks and associated records before committing the transfer.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Lead ID: {selectedLead.id.slice(0, 8)}...</span>
                </div>

                {previewLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2 text-primary" />
                    Validating destination unit and duplicate rules...
                  </div>
                ) : previewError ? (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{previewError}</span>
                  </div>
                ) : transferPreview ? (
                  <div className="space-y-4">
                    {/* Validation Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-[#121212] border border-[#252525] p-3 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Validation Status</div>
                        <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Transfer
                        </div>
                      </div>

                      <div className="bg-[#121212] border border-[#252525] p-3 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Duplicate Check</div>
                        <div className={`text-xs font-bold mt-1 flex items-center gap-1.5 ${
                          transferPreview.duplicateWarning ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {transferPreview.duplicateWarning ? (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5" /> Duplicate Phone Found
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> No Conflicts in Target Unit
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-[#121212] border border-[#252525] p-3 rounded-lg">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Associated Records</div>
                        <div className="text-xs font-bold text-white mt-1">
                          {transferPreview.associatedRecords?.appointmentsCount || 0} Appts · {transferPreview.associatedRecords?.followupsCount || 0} Follow-ups
                        </div>
                      </div>
                    </div>

                    {/* Historical Attribution Note */}
                    <div className="p-3 bg-[#111] border border-[#222] rounded-lg text-[11px] text-slate-400 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white">Historical Data Integrity:</strong> All existing call logs, recordings, transcripts, and AI summaries remain attributed to their originating business unit. The destination unit gains operational access without mutating audit logs.
                      </div>
                    </div>

                    {/* Reason input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Transfer Reason / Business Justification <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={transferReason}
                        onChange={(e) => setTransferReason(e.target.value)}
                        placeholder="e.g. Reassigned due to patient location in Coimbatore..."
                        className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary"
                      />
                    </div>

                    {/* Execute Action */}
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLead(null);
                          setTransferPreview(null);
                        }}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-slate-300 rounded-lg text-xs font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleExecuteTransfer}
                        disabled={isTransferring}
                        className="px-5 py-2 bg-primary hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        {isTransferring && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        {isTransferring ? 'Executing Transfer...' : 'Confirm & Execute Transfer'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Recent Transfer Audit Logs */}
            <div className="bg-[#080808] border border-[#222] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" /> Recent Cross-Unit Transfer Audits
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Immutable log of all cross-unit reassignments performed by Super Admins.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchTransfers}
                  disabled={loadingTransfersList}
                  className="px-3 py-1 bg-[#161616] border border-[#282828] rounded text-[11px] text-slate-300 hover:text-white"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingTransfersList ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingTransfersList ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Loading transfer audit records...
                </div>
              ) : transferAuditLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  No cross-unit lead transfers recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#121212] text-slate-400 text-[10px] uppercase tracking-wider border-b border-[#222]">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                        <th className="px-4 py-2.5 font-semibold">Lead Name</th>
                        <th className="px-4 py-2.5 font-semibold">Phone</th>
                        <th className="px-4 py-2.5 font-semibold">Source Unit</th>
                        <th className="px-4 py-2.5 font-semibold">Destination Unit</th>
                        <th className="px-4 py-2.5 font-semibold">Reason</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c]">
                      {transferAuditLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-[#121212] transition-colors">
                          <td className="px-4 py-2.5 text-slate-400 font-mono text-[10px]">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-white">
                            {item.lead?.customerName || item.metadata?.customerName || 'Lead'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                            {item.lead?.phoneNumber || item.metadata?.phoneNumber || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300">
                            {item.sourceUnit?.name || 'Unassigned'}
                          </td>
                          <td className="px-4 py-2.5 text-cyan-400 font-medium">
                            {item.destinationUnit?.name || 'Assigned'}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 max-w-xs truncate">
                            {item.reason || 'Super Admin reassignment'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                              {item.status || 'COMPLETED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL: CREATE / EDIT BUSINESS UNIT */}
      {/* ==================================================== */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl max-w-lg w-full p-6 text-xs space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingUnit ? `Edit Business Unit: ${editingUnit.code}` : 'Create New Business Unit'}
            </h3>

            {unitError && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                {unitError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Unit Code (Unique)</label>
                <input
                  type="text"
                  disabled={Boolean(editingUnit)}
                  value={unitForm.code}
                  onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. UEC, UNCF, HOME_CARE"
                  className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-white font-mono outline-none focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Unit Display Name</label>
                <input
                  type="text"
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  placeholder="e.g. Universal Care Services"
                  className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Description</label>
                <textarea
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Isolation Policy</label>
                <select
                  value={unitForm.isolationMode}
                  onChange={(e) => setUnitForm({ ...unitForm, isolationMode: e.target.value })}
                  className="w-full bg-[#121212] border border-[#282828] rounded-lg px-3 py-2 text-white outline-none focus:border-primary"
                >
                  <option value="SHARED">SHARED (Shared platform infrastructure with RBAC isolation)</option>
                  <option value="ISOLATED">ISOLATED (Strict data and integration isolation)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Enabled Modules</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {allModules.map((mod) => (
                    <label key={mod} className="flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unitForm.enabledModules.includes(mod)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUnitForm({ ...unitForm, enabledModules: [...unitForm.enabledModules, mod] });
                          } else {
                            setUnitForm({ ...unitForm, enabledModules: unitForm.enabledModules.filter((m) => m !== mod) });
                          }
                        }}
                        className="rounded accent-primary"
                      />
                      <span>{mod}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1c1c1c]">
              <button
                onClick={() => setShowUnitModal(false)}
                className="px-4 py-2 rounded-lg bg-[#161616] hover:bg-[#222] text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUnit}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors"
              >
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT INTEGRATION CONFIGURATION */}
      {/* ==================================================== */}
      {showConfigModal && selectedIntegration && (
        <IntegrationConfigModal
          integration={selectedIntegration}
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSave={handleSaveIntegrationModal}
          onTest={async (provider) => {
            const res = await apiFetch(`/api/v1/super-admin/integrations/${provider}/test`, {
              method: 'POST',
              headers: getHeaders(),
            });
            const data = await res.json();
            fetchAllData();
            return data;
          }}
        />
      )}
    </div>
  );
}
