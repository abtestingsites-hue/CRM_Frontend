"use client";

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building,
  Calendar,
  Download,
  ShieldCheck,
  Search,
  ExternalLink,
} from 'lucide-react';
import { SopNav } from '@/components/sop/SopNav';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export default function SopDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [acknowledgingDocId, setAcknowledgingDocId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // New Document Form State
  const [documentNumber, setDocumentNumber] = useState(`DOC-${Date.now().toString().slice(-4)}`);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('HR');
  const [category, setCategory] = useState('Safety & Compliance');
  const [fileUrl, setFileUrl] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isCreating, setIsCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE_URL}/api/v1/sop/documents?limit=50`;
      if (departmentFilter !== 'ALL') url += `&department=${departmentFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data || []);
      }
    } catch (err) {
      console.error('Failed to load SOP documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [departmentFilter, search]);

  const handleAcknowledge = async (docId: string) => {
    try {
      setAcknowledgingDocId(docId);
      const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/documents/${docId}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) {
        setMsg('Document acknowledged successfully!');
        await fetchDocuments();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge document');
    } finally {
      setAcknowledgingDocId(null);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/documents`, {
        method: 'POST',
        body: JSON.stringify({
          documentNumber,
          title,
          description,
          department,
          category,
          version,
          fileUrl: fileUrl || undefined,
          requiresAcknowledgement: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create document');
      }

      setIsUploadOpen(false);
      setTitle('');
      setDescription('');
      await fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Error creating document');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden">
      <SopNav />

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Compliance & Documents
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">SOP Manuals & Institutional Documents</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authorized clinical protocols, caregiver standards, emergency escalation manuals, and electronic staff sign-offs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDocuments}
              className="p-2 rounded-xl bg-[#141416] hover:bg-[#1e1e22] text-slate-400 hover:text-white border border-[#222] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                setDocumentNumber(`SOP-DOC-${Date.now().toString().slice(-4)}`);
                setIsUploadOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30"
            >
              <Plus className="w-4 h-4" />
              Register Document
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search documents by code, title, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141416] border border-[#2a2a2d] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'HR', 'CCR', 'SALES', 'DATA_ENTRY'].map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  departmentFilter === dept
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#141416] text-slate-400 hover:text-white border border-[#222]'
                }`}
              >
                {dept === 'ALL' ? 'All Departments' : dept}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" />
            <span className="text-xs">Loading authorized documentation...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-[#0f0f11] border border-[#222] rounded-xl p-16 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">No documents found</h3>
            <p className="text-xs text-slate-500 mb-4">
              Register standard operational manuals, client privacy policies, and operational protocols.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Register New Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const isAcknowledged = doc.isAcknowledgedByCurrentUser;

              return (
                <div
                  key={doc.id}
                  className="bg-[#0f0f11] border border-[#222] hover:border-[#333] rounded-xl p-5 flex flex-col justify-between shadow-xl transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-primary">{doc.documentNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e1e22] text-slate-400">
                        v{doc.version || '1.0'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{doc.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-4">
                      <span className="px-2 py-0.5 rounded bg-[#18181b] text-slate-300 border border-[#2a2a2d]">
                        {doc.department}
                      </span>
                      <span>{doc.category}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1e1e22] flex items-center justify-between">
                    <div>
                      {isAcknowledged ? (
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Signed & Acknowledged
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Requires Signature
                        </span>
                      )}
                    </div>

                    {!isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(doc.id)}
                        disabled={acknowledgingDocId === doc.id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {acknowledgingDocId === doc.id ? 'Signing...' : 'Acknowledge'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Register Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f0f11] border border-[#222] rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Register SOP Standard Document
            </h3>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Document Number</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    required
                    className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Caregiver Emergency Response Protocol"
                  required
                  className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="HR">HR</option>
                    <option value="CCR">CCR</option>
                    <option value="SALES">Sales</option>
                    <option value="DATA_ENTRY">Data Entry</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Secure File URL / Cloud Reference</label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://storage.crmtool.com/docs/sop-01.pdf"
                  className="w-full bg-[#141416] border border-[#2a2a2d] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-[#222] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#222] text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  {isCreating ? 'Saving...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
