"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLeadStore } from '@/store/useLeadStore';
import { useCallStore } from '@/store/useCallStore';
import { CallIntakeFormModal } from '@/components/call-center/CallIntakeFormModal';
import { CustomerHistoryDrawer } from '@/components/call-center/CustomerHistoryDrawer';
import {
  Phone,
  Calendar,
  AlertCircle,
  Filter,
  Search,
  UploadCloud,
  Plus,
  Globe,
  MessageCircle,
  ThumbsUp,
  Camera,
  Mail,
  UserPlus,
  Store,
  PhoneCall,
  FileText,
  History,
  CheckCircle2,
  Clock,
  HeartPulse,
  MapPin,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Tag,
  Scale,
  Sparkles,
  ShieldAlert,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export default function LeadPoolPage() {
  const { leads, fetchLeads, claimLead, isLoading } = useLeadStore();
  const { setActiveCall } = useCallStore();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_global_selected_unit');
      return (saved && saved !== 'ALL') ? saved : 'ALL';
    }
    return 'ALL';
  });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'CREATED_DESC' | 'CREATED_ASC' | 'NAME_ASC' | 'FOLLOWUP_ASC'>('CREATED_DESC');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Subservices tooltip/modal preview
  const [hoveredSubservicesLeadId, setHoveredSubservicesLeadId] = useState<string | null>(null);

  // Intake Form Modal (Manual Entry & Edit Details)
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [selectedLeadForIntake, setSelectedLeadForIntake] = useState<any | null>(null);

  // Customer History Intelligence Drawer
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Action notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const reloadLeads = () => {
    const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('paramantra_access_token') || '') : '';
    fetchLeads(token, '');
  };

  useEffect(() => {
    reloadLeads();
  }, [fetchLeads]);

  const handleClaim = async (leadId: string) => {
    let agentId = null;
    try {
      const stored = localStorage.getItem('crm_user');
      if (stored) {
        agentId = JSON.parse(stored).agentId;
      }
    } catch (e) {
      console.warn('[UI Exception Swallowed Fixed]:', e);
    }

    if (!agentId) {
      alert("Error: Agent profile not found. Please log out and log back in.");
      return;
    }

    const success = await claimLead(leadId, agentId);
    if (success) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setActiveCall({
          callSid: `outbound-${Date.now()}`,
          phone: lead.phoneNumber,
          customerName: lead.customerName,
          category: 'Outbound',
          isCaller: true,
          status: 'RINGING',
          leadId: lead.id
        });
      }
      setToastMessage("Lead claimed! Outbound call initiated.");
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      alert("Failed to claim lead. It might be locked by another agent.");
    }
  };

  const handleCallLead = (lead: any) => {
    setActiveCall({
      callSid: `outbound-${Date.now()}`,
      phone: lead.phoneNumber,
      customerName: lead.customerName,
      category: 'Outbound',
      isCaller: true,
      status: 'RINGING',
      leadId: lead.id,
    });
    setToastMessage(`Initiating outbound call to ${lead.customerName}...`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenEditIntake = (lead: any) => {
    setSelectedLeadForIntake(lead);
    setIsIntakeOpen(true);
  };

  const handleOpenManualEntry = () => {
    setSelectedLeadForIntake(null);
    setIsIntakeOpen(true);
  };

  const handleOpenCustomerHistory = (phone: string) => {
    setHistoryPhone(phone);
    setIsHistoryOpen(true);
  };

  const getSourceIcon = (source?: string | null) => {
    const s = source?.toLowerCase() || '';
    if (s.includes('whatsapp')) return <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />;
    if (s.includes('facebook')) return <ThumbsUp className="w-3.5 h-3.5 text-blue-500" />;
    if (s.includes('instagram')) return <Camera className="w-3.5 h-3.5 text-pink-500" />;
    if (s.includes('email')) return <Mail className="w-3.5 h-3.5 text-rose-400" />;
    if (s.includes('referral')) return <UserPlus className="w-3.5 h-3.5 text-purple-400" />;
    if (s.includes('walk-in') || s.includes('walkin')) return <Store className="w-3.5 h-3.5 text-amber-400" />;
    if (s.includes('inbound') || s.includes('incoming')) return <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />;
    if (s.includes('outbound') || s.includes('outgoing')) return <Phone className="w-3.5 h-3.5 text-blue-400" />;
    if (s.includes('manual')) return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
    return <Globe className="w-3.5 h-3.5 text-slate-400" />;
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
          ACARE
        </span>
      );
    }
    if (org.includes('HOME_CARE') || org.includes('HOME CARE') || org.includes('IN_HOME')) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold text-[10px] border border-amber-500/30">
          HOME_CARE
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
        UEC
      </span>
    );
  };

  const getStatusBadge = (status: string, disposition?: string | null) => {
    const disp = disposition || status;
    const s = (status || '').toUpperCase();
    if (s === 'CONVERTED' || disp === 'CONVERTED') {
      return <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[11px] font-bold border border-purple-500/30">CONVERTED</span>;
    }
    if (s === 'POSITIVE' || disp === 'INTERESTED' || disp === 'APPOINTMENT_SCHEDULED') {
      return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">POSITIVE</span>;
    }
    if (s === 'FOLLOWUP_REQUIRED' || disp === 'FOLLOWUP_REQUIRED' || disp === 'CALLBACK_REQUESTED') {
      return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[11px] font-bold border border-amber-500/30">FOLLOW-UP</span>;
    }
    if (s === 'IN_PROGRESS' || disp === 'CONTACTED' || disp === 'PROPOSAL_SHARED') {
      return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold border border-blue-500/30">IN PROGRESS</span>;
    }
    if (s === 'CLOSED' || s === 'NEGATIVE' || disp === 'CLOSED_LOST' || disp === 'NOT_INTERESTED') {
      return <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-bold border border-rose-500/30">CLOSED</span>;
    }
    return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[11px] font-bold border border-blue-500/30">NEW</span>;
  };

  const formatFollowupDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return null;

    const now = new Date();
    const isPast = dt.getTime() < now.getTime();
    const isToday = dt.toDateString() === now.toDateString();

    const dateFormatted = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeFormatted = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isPast) {
      return {
        label: `${dateFormatted}, ${timeFormatted}`,
        badge: 'Overdue',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      };
    }
    if (isToday) {
      return {
        label: `Today ${timeFormatted}`,
        badge: 'Today',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      };
    }
    return {
      label: `${dateFormatted}, ${timeFormatted}`,
      badge: 'Upcoming',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    };
  };

  // Filter & Sort Logic
  const filteredAndSortedLeads = useMemo(() => {
    let result = leads.filter((l) => {
      if (!l) return false;

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'NEW' && l.status !== 'NEW') return false;
        if (statusFilter === 'CONTACTED' && l.status !== 'IN_PROGRESS' && l.customerDisposition !== 'CONTACTED') return false;
        if (statusFilter === 'IN_PROGRESS' && l.status !== 'IN_PROGRESS') return false;
        if (statusFilter === 'FOLLOWUP_REQUIRED' && l.status !== 'FOLLOWUP_REQUIRED') return false;
        if (statusFilter === 'POSITIVE' && l.status !== 'POSITIVE') return false;
        if (statusFilter === 'CONVERTED' && l.status !== 'CONVERTED') return false;
        if (statusFilter === 'CLOSED' && l.status !== 'CLOSED' && l.status !== 'NEGATIVE') return false;
      }

      // Organization Filter
      if (orgFilter !== 'ALL') {
        const leadOrg = (l.foundation || l.unit?.code || l.unit?.name || l.unitName || '').toUpperCase();
        if (!leadOrg.includes(orgFilter.toUpperCase())) return false;
      }

      // Category Filter
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'AMBULANCE') {
          if (!l.isAmbulanceEmergency && !l.primaryService?.toLowerCase().includes('ambulance')) return false;
        } else if (l.enquiryCategory !== categoryFilter) {
          return false;
        }
      }

      // Agent Filter
      if (agentFilter !== 'ALL') {
        if (agentFilter === 'UNASSIGNED' && l.assignedAgentId) return false;
        if (agentFilter === 'ASSIGNED' && !l.assignedAgentId) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const name = (l.customerName || '').toLowerCase();
        const phone = (l.phoneNumber || '').toLowerCase();
        const secPhone = (l.secondaryPhone || '').toLowerCase();
        const service = (l.primaryService || l.serviceInterest || '').toLowerCase();
        const patient = (l.patientName || '').toLowerCase();
        const agent = (l.agentName || '').toLowerCase();
        const org = (l.foundation || '').toLowerCase();

        return (
          name.includes(q) ||
          phone.includes(q) ||
          secPhone.includes(q) ||
          service.includes(q) ||
          patient.includes(q) ||
          agent.includes(q) ||
          org.includes(q)
        );
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'CREATED_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'CREATED_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'NAME_ASC') {
        return (a.customerName || '').localeCompare(b.customerName || '');
      }
      if (sortBy === 'FOLLOWUP_ASC') {
        const aDate = a.followupDate ? new Date(a.followupDate).getTime() : 9999999999999;
        const bDate = b.followupDate ? new Date(b.followupDate).getTime() : 9999999999999;
        return aDate - bDate;
      }
      return 0;
    });

    return result;
  }, [leads, statusFilter, orgFilter, categoryFilter, agentFilter, searchTerm, sortBy]);

  // Paginated Slices
  const totalLeads = filteredAndSortedLeads.length;
  const totalPages = Math.ceil(totalLeads / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedLeads.slice(start, start + pageSize);
  }, [filteredAndSortedLeads, currentPage, pageSize]);

  return (
    <div className="p-4 md:p-6 bg-[#050505] min-h-screen text-white">
      <div className="max-w-[1700px] mx-auto space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="p-3 px-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Lead Data</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 text-xs font-semibold">
                {totalLeads} {totalLeads === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Comprehensive customer intake table, care requirements, multi-unit routing, and persistent disposition tracking.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={reloadLeads}
              className="p-2.5 bg-[#141416] hover:bg-[#1e1e22] text-slate-400 hover:text-white border border-[#222] rounded-xl transition-colors"
              title="Refresh Leads"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button 
              onClick={handleOpenManualEntry}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#18181b] hover:bg-[#222] border border-[#333] hover:border-orange-500/50 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-orange-400" />
              Manual Enquiry Entry
            </button>
            <Link href="/leads/upload">
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20 rounded-xl text-xs font-bold transition-all">
                <UploadCloud className="w-4 h-4" />
                Upload Leads
              </button>
            </Link>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#0c0c0e] border border-[#222] p-3.5 rounded-2xl">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              aria-label="Search enquiries" 
              type="text"
              placeholder="Search enquiries by customer, phone, patient, service, or agent..."
              className="w-full bg-[#141416] border border-[#222] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Organization Filter */}
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#222] px-2.5 py-1 rounded-xl">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Organization filter"
                value={orgFilter}
                onChange={(e) => {
                  setOrgFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Organizations</option>
                <option value="UEC">UEC</option>
                <option value="UNCF">UNCF</option>
                <option value="ACARE">ACare</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#222] px-2.5 py-1 rounded-xl">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Category filter"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="SERVICE_ENQUIRY">Service Enquiry</option>
                <option value="JOB_ENQUIRY">Job Enquiry</option>
                <option value="VOLUNTEER_ENQUIRY">Volunteer Enquiry</option>
                <option value="DONATION_ENQUIRY">Donation Enquiry</option>
                <option value="AMBULANCE">Ambulance Emergency</option>
              </select>
            </div>

            {/* Customer Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#222] px-2.5 py-1 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Status filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FOLLOWUP_REQUIRED">Follow-up Required</option>
                <option value="POSITIVE">Positive</option>
                <option value="CONVERTED">Converted</option>
                <option value="CLOSED">Closed / Lost</option>
              </select>
            </div>

            {/* Agent Filter */}
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#222] px-2.5 py-1 rounded-xl">
              <UserPlus className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Agent filter"
                value={agentFilter}
                onChange={(e) => {
                  setAgentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL">All Agents</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                <option value="ASSIGNED">Assigned Only</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5 bg-[#141416] border border-[#222] px-2.5 py-1 rounded-xl">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="CREATED_DESC">Newest First</option>
                <option value="CREATED_ASC">Oldest First</option>
                <option value="NAME_ASC">Name (A-Z)</option>
                <option value="FOLLOWUP_ASC">Earliest Follow-up</option>
              </select>
            </div>
          </div>
        </div>

        {/* 13-Column Redesigned Table View */}
        <div className="hidden lg:block bg-[#0f0f11] border border-[#222] rounded-2xl overflow-x-auto shadow-2xl custom-scrollbar">
          <table aria-label="Lead Data Table" className="w-full text-left text-xs whitespace-nowrap min-w-[1550px]">
            <thead className="bg-[#141416] border-b border-[#222] text-slate-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-3.5">1. Enquiry Name</th>
                <th scope="col" className="px-3.5 py-3.5">2. Organization</th>
                <th scope="col" className="px-3.5 py-3.5">3. Category</th>
                <th scope="col" className="px-4 py-3.5">4. Requested Services</th>
                <th scope="col" className="px-3.5 py-3.5">5. Subcategory</th>
                <th scope="col" className="px-4 py-3.5">6. Primary Contact</th>
                <th scope="col" className="px-3.5 py-3.5">7. Secondary Contact</th>
                <th scope="col" className="px-4 py-3.5">8. Patient Details</th>
                <th scope="col" className="px-3.5 py-3.5">9. Source</th>
                <th scope="col" className="px-3.5 py-3.5">10. Assigned Agent</th>
                <th scope="col" className="px-3.5 py-3.5">11. Customer Status</th>
                <th scope="col" className="px-4 py-3.5">12. Next Follow-up</th>
                <th scope="col" className="px-4 py-3.5 text-right sticky right-0 bg-[#141416] shadow-l">13. Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e22]">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20 text-center text-slate-500">
                    <div className="w-7 h-7 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2.5" />
                    <p className="font-semibold text-slate-300">Loading structured lead records...</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Fetching omnichannel inquiries, patient health specs, and calendar follow-ups.</p>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-300">No lead records found</p>
                    <p className="text-[11px] text-slate-500 mt-1">Try adjusting your filters or record a new customer enquiry.</p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const serviceLabel = lead.primaryService || lead.serviceInterest || 'General Inquiry';
                  const subServices = lead.subServices || [];
                  const followupInfo = formatFollowupDate(lead.followupDate || lead.nextFollowup);

                  return (
                    <tr key={lead.id} className="hover:bg-[#141416]/80 transition-colors group">
                      
                      {/* 1. Customer / Enquiry Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span 
                            onClick={() => handleOpenEditIntake(lead)}
                            className="font-bold text-white text-xs hover:text-orange-400 transition-colors cursor-pointer truncate max-w-[180px]"
                            title={lead.customerName || 'Unknown Contact'}
                          >
                            {lead.customerName || 'Unknown Contact'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Created: {new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* 2. Organization */}
                      <td className="px-3.5 py-3.5">
                        {getOrganizationBadge(lead.foundation || lead.unit?.code || lead.unit?.name || lead.unitName)}
                      </td>

                      {/* 3. Enquiry Category */}
                      <td className="px-3.5 py-3.5">
                        {lead.isAmbulanceEmergency ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <ShieldAlert className="w-3 h-3 text-rose-400" /> Ambulance
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs capitalize">
                            {(lead.enquiryCategory || 'Service Enquiry').replace(/_/g, ' ').toLowerCase()}
                          </span>
                        )}
                      </td>

                      {/* 4. Requested Services */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-orange-950/40 text-orange-400 text-[11px] font-semibold border border-orange-500/30 truncate max-w-[160px]" title={serviceLabel}>
                            {serviceLabel}
                          </span>
                          {subServices.length > 0 && (
                            <div className="relative group/sub">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700 cursor-pointer">
                                +{subServices.length}
                              </span>
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover/sub:block z-30 p-2 bg-[#18181b] border border-[#333] rounded-xl shadow-2xl text-[10px] text-slate-200 min-w-[160px] whitespace-normal">
                                <div className="font-bold text-orange-400 mb-1">Additional Requirements:</div>
                                <ul className="list-disc pl-3 space-y-0.5">
                                  {subServices.map((sub: string, i: number) => (
                                    <li key={i}>{sub}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Subcategory */}
                      <td className="px-3.5 py-3.5">
                        <span className="text-slate-400 text-xs">
                          {lead.careDurationCategory || lead.careDuration || lead.engagementType || 'Standard'}
                        </span>
                      </td>

                      {/* 6. Primary Contact */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-200 font-semibold text-xs">{lead.phoneNumber}</span>
                          {lead.whatsappStatus === 'VERIFIED' && (
                            <span title="Verified WhatsApp Number">
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            </span>
                          )}
                          <button
                            onClick={() => handleCallLead(lead)}
                            className="p-1 rounded bg-[#18181b] hover:bg-orange-600/20 text-slate-400 hover:text-orange-400 transition-colors ml-1"
                            title="Direct Dial"
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 7. Secondary Contact */}
                      <td className="px-3.5 py-3.5 font-mono text-slate-400 text-xs">
                        {lead.secondaryPhone ? (
                          <span>{lead.secondaryCountryCode || ''} {lead.secondaryPhone}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 8. Patient Details */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        {lead.patientName ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1 truncate">
                              <HeartPulse className="w-3 h-3 text-rose-400 shrink-0" />
                              {lead.patientName}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                              {lead.patientAge ? <span>{lead.patientAge} yrs</span> : null}
                              {lead.patientWeight ? (
                                <span className="flex items-center gap-0.5 text-cyan-400">
                                  <Scale className="w-2.5 h-2.5" />
                                  {lead.patientWeight} {lead.patientWeightUnit || 'kg'}
                                </span>
                              ) : null}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 9. Source */}
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300">
                          {getSourceIcon(lead.source)}
                          <span className="truncate max-w-[110px]" title={lead.source || 'Website'}>
                            {lead.source || 'Website'}
                          </span>
                        </div>
                      </td>

                      {/* 10. Assigned Agent */}
                      <td className="px-3.5 py-3.5">
                        {lead.agentName && lead.agentName !== 'Unassigned' ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-[10px] font-bold">
                              {lead.agentName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-slate-200 font-medium truncate max-w-[100px]" title={lead.agentName}>
                              {lead.agentName}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold border border-slate-700">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 11. Customer Status */}
                      <td className="px-3.5 py-3.5">
                        {getStatusBadge(lead.status, lead.customerDisposition)}
                      </td>

                      {/* 12. Next Follow-up */}
                      <td className="px-4 py-3.5">
                        {followupInfo ? (
                          <div className="flex flex-col">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold inline-flex items-center gap-1 w-fit ${followupInfo.color}`}>
                              <Calendar className="w-2.5 h-2.5" />
                              {followupInfo.badge}
                            </span>
                            <span className="text-[10px] text-slate-300 mt-0.5 font-mono">
                              {followupInfo.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* 13. Actions */}
                      <td className="px-4 py-3.5 text-right sticky right-0 bg-[#0f0f11] shadow-l">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View/Edit Structured Intake */}
                          <button
                            onClick={() => handleOpenEditIntake(lead)}
                            className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#222] text-slate-300 hover:text-white border border-[#2a2a2d] hover:border-orange-500/40 transition-colors"
                            title="View / Edit Enquiry Details"
                          >
                            <FileText className="w-3.5 h-3.5 text-orange-400" />
                          </button>

                          {/* Customer History Drawer */}
                          <button
                            onClick={() => handleOpenCustomerHistory(lead.phoneNumber)}
                            className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#222] text-slate-300 hover:text-white border border-[#2a2a2d] hover:border-blue-500/40 transition-colors"
                            title="Customer Call History & Messaging Timeline"
                          >
                            <History className="w-3.5 h-3.5 text-blue-400" />
                          </button>

                          {/* Call / Claim */}
                          {lead.status === 'NEW' ? (
                            <button
                              onClick={() => handleClaim(lead.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm shadow-orange-600/20"
                              title="Claim and Call"
                            >
                              <Phone className="w-3 h-3" />
                              Claim
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCallLead(lead)}
                              className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                              title="Call Lead"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalLeads > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-[#222] text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Showing <strong>{Math.min(totalLeads, (currentPage - 1) * pageSize + 1)}</strong> to <strong>{Math.min(totalLeads, currentPage * pageSize)}</strong> of <strong>{totalLeads}</strong> enquiries</span>
              <span className="text-slate-600">•</span>
              <select
                aria-label="Records per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#141416] border border-[#222] rounded-lg px-2 py-1 text-slate-300 outline-none"
              >
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg bg-[#141416] border border-[#222] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-mono text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg bg-[#141416] border border-[#222] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Cards View (Responsive) */}
        <div className="block lg:hidden space-y-3">
          {isLoading ? (
            <div className="text-center py-12 bg-[#111] border border-[#222] rounded-2xl text-slate-500">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading leads...</p>
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="text-center py-12 bg-[#111] border border-[#222] rounded-2xl text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-300">No leads found</p>
            </div>
          ) : (
            paginatedLeads.map((lead) => {
              const followupInfo = formatFollowupDate(lead.followupDate || lead.nextFollowup);
              return (
                <div key={lead.id} className="bg-[#0f0f11] border border-[#222] rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-white">{lead.customerName}</h3>
                        {getOrganizationBadge(lead.foundation || lead.unit?.code || lead.unit?.name || lead.unitName)}
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{lead.phoneNumber}</p>
                      {lead.patientName && (
                        <p className="text-[11px] text-rose-400 mt-0.5 flex items-center gap-1">
                          <HeartPulse className="w-3 h-3" /> Patient: {lead.patientName} {lead.patientWeight ? `(${lead.patientWeight} ${lead.patientWeightUnit || 'kg'})` : ''}
                        </p>
                      )}
                    </div>
                    <div>{getStatusBadge(lead.status, lead.customerDisposition)}</div>
                  </div>

                  <div className="bg-[#141416] p-2.5 rounded-xl border border-[#222] text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-semibold text-orange-400">{lead.primaryService || lead.serviceInterest || 'General Inquiry'}</span>
                      <span className="text-[10px]">{lead.careDurationCategory || lead.careDuration || ''}</span>
                    </div>
                    {lead.subServices && lead.subServices.length > 0 && (
                      <p className="text-[10px] text-slate-400 truncate">
                        Requirements: {lead.subServices.join(', ')}
                      </p>
                    )}
                  </div>

                  {followupInfo && (
                    <div className="flex items-center justify-between text-[11px] bg-[#121820] p-2 rounded-xl border border-[#1e2a38]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-orange-400" /> Next Follow-up:
                      </span>
                      <span className={`px-2 py-0.2 rounded font-bold ${followupInfo.color}`}>
                        {followupInfo.label}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1e1e22]">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      {getSourceIcon(lead.source)}
                      <span className="text-[11px]">{lead.source || 'Website'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px]">{lead.agentName || 'Unassigned'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditIntake(lead)}
                        className="px-2.5 py-1 rounded-lg bg-[#18181b] border border-[#333] hover:border-orange-500/40 text-xs text-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCallLead(lead)}
                        className="px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Structured Intake Form Modal (Manual Entry or Edit Lead) */}
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
            setToastMessage("Enquiry intake saved and persisted successfully.");
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}

      {/* Customer History Drawer */}
      <CustomerHistoryDrawer
        identifier={historyPhone}
        isOpen={isHistoryOpen}
        onClose={() => {
          setIsHistoryOpen(false);
          setHistoryPhone(null);
        }}
      />
    </div>
  );
}
