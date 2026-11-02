"use client";

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  FileText,
  Tag,
  Building,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Phone,
  ArrowRight,
  Send,
  X,
  Check,
  Calendar,
  Layers,
  HeartHandshake,
  Star,
  Activity,
} from 'lucide-react';
import { apiFetch, API_BASE_URL } from '@/lib/api';

// ==========================================
// 1. HR OPERATIONAL WORKFLOW VIEW
// ==========================================

export function HrOperationsView({ unitId }: { unitId?: string }) {
  const [subTab, setSubTab] = useState<'staff' | 'wanted' | 'stock'>('staff');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [wantedList, setWantedList] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddWantedOpen, setIsAddWantedOpen] = useState(false);
  const [selectedStaffForFollowup, setSelectedStaffForFollowup] = useState<any | null>(null);
  const [followupNotes, setFollowupNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // New staff form state
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'CAREGIVER',
    classification: 'NORMAL',
    qualifications: '',
    experienceYears: 1,
    city: 'Chennai',
    preferredShift: 'DAY',
    dailyRate: 1000,
    source: 'WALK_IN',
  });

  // New wanted staff form state
  const [newWanted, setNewWanted] = useState({
    category: 'CAREGIVER',
    qualificationRequired: 'Certified GDA / ANM',
    location: 'Chennai',
    openPositions: 2,
    urgency: 'NORMAL',
    requiredByDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, wantedRes, stockRes] = await Promise.all([
        apiFetch(`${API_BASE_URL}/api/v1/sop/staff?limit=50`),
        apiFetch(`${API_BASE_URL}/api/v1/sop/requirements?status=OPEN`),
        apiFetch(`${API_BASE_URL}/api/v1/sop/staff/stock`),
      ]);

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaffList(data.items || []);
      }
      if (wantedRes.ok) {
        const data = await wantedRes.json();
        setWantedList(data || []);
      }
      if (stockRes.ok) {
        const data = await stockRes.json();
        setStockSummary(data || []);
      }
    } catch (e) {
      console.error('Failed to load HR operations data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [unitId]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingId('create');
      const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/staff`, {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      if (res.ok) {
        setIsAddStaffOpen(false);
        setNewStaff({
          name: '',
          phone: '',
          email: '',
          category: 'CAREGIVER',
          classification: 'NORMAL',
          qualifications: '',
          experienceYears: 1,
          city: 'Chennai',
          preferredShift: 'DAY',
          dailyRate: 1000,
          source: 'WALK_IN',
        });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create staff');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating staff');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateWanted = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingId('wanted');
      const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/requirements`, {
        method: 'POST',
        body: JSON.stringify(newWanted),
      });
      if (res.ok) {
        setIsAddWantedOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || 'Error creating requirement');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSecondHrConfirm = async (staffId: string) => {
    try {
      setProcessingId(staffId);
      const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/staff/${staffId}/second-hr-confirm`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Second-HR confirmation failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleThreeDayFollowup = async () => {
    if (!selectedStaffForFollowup) return;
    try {
      setProcessingId(selectedStaffForFollowup.id);
      const res = await apiFetch(
        `${API_BASE_URL}/api/v1/sop/staff/${selectedStaffForFollowup.id}/three-day-followup`,
        {
          method: 'POST',
          body: JSON.stringify({ notes: followupNotes || 'Staff settled in placement successfully.', successful: true }),
        },
      );
      if (res.ok) {
        setSelectedStaffForFollowup(null);
        setFollowupNotes('');
        fetchData();
      }
    } catch (err) {
      console.error('Three-day follow-up failed', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub navigation bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0d0d0f] border border-[#222]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('staff')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'staff'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-[#18181b] text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Stock & Candidates ({staffList.length})
          </button>
          <button
            onClick={() => setSubTab('wanted')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'wanted'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'bg-[#18181b] text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Wanted Staff Alarms ({wantedList.length})
          </button>
          <button
            onClick={() => setSubTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              subTab === 'stock'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#18181b] text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Category Stock Summary
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#18181b] text-slate-400 hover:text-white border border-[#2a2a2d]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          {subTab === 'staff' && (
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Register Candidate
            </button>
          )}
          {subTab === 'wanted' && (
            <button
              onClick={() => setIsAddWantedOpen(true)}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Wanted Alarm
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Staff Directory */}
      {subTab === 'staff' && (
        <div className="bg-[#0f0f11] border border-[#222] rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#222] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Active Field Staff & Candidate Verification Pipeline
            </h3>
            <span className="text-xs text-slate-400">Total: {staffList.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141416] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222]">
                <tr>
                  <th className="p-3">Staff ID & Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Classification</th>
                  <th className="p-3">Verification</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">3-Day Follow-up</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e22] text-slate-300">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No staff records registered yet. Click &quot;Register Candidate&quot; to add.
                    </td>
                  </tr>
                ) : (
                  staffList.map((stf) => (
                    <tr key={stf.id} className="hover:bg-[#18181b]/50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-emerald-400 text-[11px] block">{stf.staffId}</span>
                        <span className="font-bold text-white">{stf.name}</span>
                        <span className="text-[10px] text-slate-500 block">Exp: {stf.experienceYears || 0} yrs â€¢ {stf.city || 'TN'}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-slate-300">{stf.phone}</span>
                        {stf.email && <span className="text-[10px] text-slate-500 block">{stf.email}</span>}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {stf.category}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{stf.preferredShift} shift</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stf.classification === 'GOOD'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : stf.classification === 'BAD'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {stf.classification}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stf.verificationStatus === 'SECOND_HR_CONFIRMED' || stf.verificationStatus === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {stf.verificationStatus}
                        </span>
                        {stf.secondHrVerifiedBy && (
                          <span className="text-[9px] text-slate-500 block mt-0.5">By: {stf.secondHrVerifiedBy}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stf.isAvailable
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {stf.isAvailable ? 'AVAILABLE' : 'DEPLOYED'}
                        </span>
                      </td>
                      <td className="p-3">
                        {stf.threeDayFollowupDone ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedStaffForFollowup(stf)}
                            className="px-2 py-1 rounded text-[10px] bg-[#1e1e22] hover:bg-[#2a2a2d] text-amber-400 border border-amber-500/20"
                          >
                            Execute Follow-up
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {stf.verificationStatus !== 'SECOND_HR_CONFIRMED' && (
                          <button
                            onClick={() => handleSecondHrConfirm(stf.id)}
                            disabled={processingId === stf.id}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 transition-colors"
                          >
                            Second-HR Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Wanted Staff Alarms */}
      {subTab === 'wanted' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wantedList.length === 0 ? (
            <div className="col-span-3 p-8 text-center text-slate-500 bg-[#0f0f11] border border-[#222] rounded-xl">
              No active wanted staff alarms. All unit requirements fulfilled.
            </div>
          ) : (
            wantedList.map((req) => (
              <div key={req.id} className="bg-[#0f0f11] border border-[#222] rounded-xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-rose-400 font-bold">{req.requirementCode}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      req.urgency === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {req.urgency} URGENCY
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{req.category}</h4>
                  <p className="text-xs text-slate-400 mt-1">{req.qualificationRequired || 'Standard Qualification'}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#1e1e22]">
                  <span>Required By: <strong className="text-white">{new Date(req.requiredByDate).toLocaleDateString()}</strong></span>
                  <span>Positions: <strong className="text-emerald-400">{req.fulfilledPositions}/{req.openPositions}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Stock Summary */}
      {subTab === 'stock' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stockSummary.length === 0 ? (
            <div className="col-span-4 p-8 text-center text-slate-500 bg-[#0f0f11] border border-[#222] rounded-xl">
              No stock data available.
            </div>
          ) : (
            stockSummary.map((item, idx) => (
              <div key={idx} className="bg-[#0f0f11] border border-[#222] rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-white uppercase">{item.category}</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-emerald-400">{item.availableCount}</span>
                  <span className="text-[10px] text-slate-500 font-medium">Class: {item.classification}</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-[#1e1e22]">
                  Verified & Ready for Handover
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Register Candidate */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f11] border border-[#222] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Register New Healthcare Staff / Candidate
              </h3>
              <button onClick={() => setIsAddStaffOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number (E.164) *</label>
                  <input
                    type="text"
                    required
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category *</label>
                  <select
                    value={newStaff.category}
                    onChange={(e) => setNewStaff({ ...newStaff, category: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  >
                    <option value="CAREGIVER">Caregiver (Assisted / Bedridden)</option>
                    <option value="NURSE">Staff Nurse (GNM / BSc)</option>
                    <option value="ICU_NURSE">ICU / Critical Care Nurse</option>
                    <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                    <option value="DEMENTIA_CARE">Dementia / Alzheimer Specialist</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Classification *</label>
                  <select
                    value={newStaff.classification}
                    onChange={(e) => setNewStaff({ ...newStaff, classification: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  >
                    <option value="GOOD">Good (Top Performer / High Rating)</option>
                    <option value="NORMAL">Normal (Standard Verification)</option>
                    <option value="BAD">Bad (Disciplinary Flag)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={newStaff.experienceYears}
                    onChange={(e) => setNewStaff({ ...newStaff, experienceYears: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Daily Rate (â‚¹)</label>
                  <input
                    type="number"
                    value={newStaff.dailyRate}
                    onChange={(e) => setNewStaff({ ...newStaff, dailyRate: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Qualifications & Certifications</label>
                <input
                  type="text"
                  placeholder="e.g. BLS, Dementia Care Certification, First Aid"
                  value={newStaff.qualifications}
                  onChange={(e) => setNewStaff({ ...newStaff, qualifications: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#18181b] hover:bg-[#222] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === 'create'}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2"
                >
                  <SaveStaffIcon /> Save & Initialize Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Wanted Staff Alarm */}
      {isAddWantedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f11] border border-[#222] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                Add Wanted Staff Alarm
              </h3>
              <button onClick={() => setIsAddWantedOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWanted} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Required Category *</label>
                <select
                  value={newWanted.category}
                  onChange={(e) => setNewWanted({ ...newWanted, category: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                >
                  <option value="CAREGIVER">Caregiver</option>
                  <option value="NURSE">Staff Nurse</option>
                  <option value="ICU_NURSE">ICU Specialist Nurse</option>
                  <option value="PHYSIOTHERAPIST">Physiotherapist</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Positions Needed</label>
                  <input
                    type="number"
                    value={newWanted.openPositions}
                    onChange={(e) => setNewWanted({ ...newWanted, openPositions: Number(e.target.value) })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Urgency</label>
                  <select
                    value={newWanted.urgency}
                    onChange={(e) => setNewWanted({ ...newWanted, urgency: e.target.value })}
                    className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Required By Date *</label>
                <input
                  type="date"
                  required
                  value={newWanted.requiredByDate}
                  onChange={(e) => setNewWanted({ ...newWanted, requiredByDate: e.target.value })}
                  className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setIsAddWantedOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#18181b] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                >
                  Broadcast Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Three-Day Follow-Up */}
      {selectedStaffForFollowup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f0f11] border border-[#222] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Record 3-Day Joining Follow-Up
              </h3>
              <button onClick={() => setSelectedStaffForFollowup(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Staff: <strong className="text-white">{selectedStaffForFollowup.name}</strong> ({selectedStaffForFollowup.staffId})
            </p>

            <div>
              <label className="text-slate-400 block mb-1 text-xs">Follow-up Notes & Care Feedback</label>
              <textarea
                rows={3}
                placeholder="Confirm staff arrival, punctuality, uniform adherence, patient rapport..."
                value={followupNotes}
                onChange={(e) => setFollowupNotes(e.target.value)}
                className="w-full bg-[#18181b] border border-[#2a2a2d] rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedStaffForFollowup(null)}
                className="px-4 py-2 rounded-lg bg-[#18181b] text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleThreeDayFollowup}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Confirm Follow-Up Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveStaffIcon() {
  return <Check className="w-4 h-4" />;
}

// ==========================================
// 2. SALES OPERATIONAL WORKFLOW VIEW
// ==========================================

export function SalesOperationsView() {
  const [targetData, setTargetData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTarget = async () => {
      try {
        setLoading(true);
        // Fetch current user target
        let agentId = 'self';
        try {
          const stored = localStorage.getItem('crm_user');
          if (stored) agentId = JSON.parse(stored).agentId || 'self';
        } catch {}

        const res = await apiFetch(`${API_BASE_URL}/api/v1/sop/sales/targets/${agentId}`);
        if (res.ok) {
          const json = await res.json();
          setTargetData(json);
        }
      } catch (err) {
        console.error('Failed to load sales target', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTarget();
  }, []);

  const target = targetData?.monthlyTarget || 500000;
  const closed = targetData?.closedRevenue || 0;
  const percent = targetData?.achievementPercent || 0;

  return (
    <div className="space-y-6">
      {/* Monthly Target Performance Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-[#0f0f11] to-[#0f0f11] border border-emerald-500/20 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SOP Sales Target Performance
            </span>
            <h2 className="text-xl font-bold text-white mt-1">Monthly Minimum Sales Target (â‚¹5 Lakh)</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Target enforcement for telecallers and sales coordinators as mandated by the Sales SOP.
            </p>
          </div>

          <div className="text-right">
            <span className="text-3xl font-extrabold text-emerald-400">â‚¹{closed.toLocaleString()}</span>
            <span className="text-xs text-slate-500 block">of â‚¹{target.toLocaleString()} Target</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Progress: <strong className="text-white">{percent}% Achieved</strong></span>
            <span>Pending: <strong className="text-amber-400">â‚¹{(targetData?.pendingToTarget || 0).toLocaleString()}</strong></span>
          </div>
          <div className="w-full bg-[#18181b] h-3 rounded-full overflow-hidden border border-[#2a2a2d]">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>

        {/* SOP Pipeline Stage Flowchart */}
        <div className="pt-4 border-t border-[#1e1e22]">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            SOP 11-Stage Closed-Loop Sales Pipeline
          </h4>
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 text-[11px]">
            {[
              '1. Requirement',
              '2. Qualified',
              '3. Business Closed',
              '4. TLM Approved',
              '5. MD Handover',
              '6. HR Staff Matched',
              '7. Conf Call',
              '8. Payment',
              '9. Delivery',
              '10. 3-Day Follow-up',
              '11. Closed Won',
            ].map((stg, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1.5 rounded-lg bg-[#141416] border border-[#222] font-semibold text-slate-300">
                  {stg}
                </span>
                {i < 10 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. CCR OPERATIONAL WORKFLOW VIEW
// ==========================================

export function CcrOperationsView() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-6">
      <div className="bg-[#0f0f11] border border-[#222] rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <HeartHandshake className="w-5 h-5 text-rose-400" />
          CCR Complaint Resolution & Follow-Up Lifecycle
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Priority breakdown: Emergency, Above-Normal, Normal. Enforces caregiver replacement, manager approval, and 3-day / 10-day post-resolution follow-ups.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-xs font-bold text-rose-400 uppercase">Emergency Complaints</span>
            <span className="text-2xl font-bold text-white mt-1 block">0 Active</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Immediate 1-hour resolution protocol</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-400 uppercase">Above-Normal Severity</span>
            <span className="text-2xl font-bold text-white mt-1 block">0 Active</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Caregiver replacement required</span>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-xs font-bold text-blue-400 uppercase">Standard Complaints</span>
            <span className="text-2xl font-bold text-white mt-1 block">0 Active</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Zero-complaint target compliance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
