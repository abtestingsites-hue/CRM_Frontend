"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2, 
  Clock, MapPin, Calendar, User, FileText, Check, ChevronDown, 
  ChevronRight, RefreshCw, Save, ExternalLink, AlertCircle, HeartPulse,
  Activity, CheckSquare, Square, Search, Lock, Unlock
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useCallStore } from '@/store/useCallStore';
import { Conversation } from '@/store/conversationStore';

interface OmnichannelEnquiryPanelProps {
  conversation: Conversation;
  onUpdateConversation?: (updated: any) => void;
  className?: string;
}

export function OmnichannelEnquiryPanel({ 
  conversation, 
  onUpdateConversation,
  className = "" 
}: OmnichannelEnquiryPanelProps) {
  const { setActiveCall } = useCallStore();

  // Active sub-tab in panel
  const [activeTab, setActiveTab] = useState<'classification' | 'patient' | 'notes'>('classification');

  // Service catalog state
  const [foundations, setFoundations] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [careConfig, setCareConfig] = useState<any>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Form State
  const [selectedFoundation, setSelectedFoundation] = useState<string>(conversation.foundation || 'UEC');
  const [enquiryCategory, setEnquiryCategory] = useState<string>(conversation.enquiryCategory || 'SERVICE_ENQUIRY');
  const [primaryService, setPrimaryService] = useState<string>(conversation.primaryService || '');
  const [selectedSubServices, setSelectedSubServices] = useState<string[]>(conversation.subServices || []);
  const [serviceSearch, setServiceSearch] = useState('');

  // Patient info
  const initialMeta = conversation.intakeMetadata || {};
  const [patientName, setPatientName] = useState<string>(conversation.lead?.patientName || initialMeta.patientName || '');
  const [patientAge, setPatientAge] = useState<string>(conversation.lead?.patientAge ? String(conversation.lead.patientAge) : (initialMeta.patientAge ? String(initialMeta.patientAge) : ''));
  const [patientConditions, setPatientConditions] = useState<string>(conversation.lead?.patientConditions || initialMeta.patientConditions || '');
  const [patientMobility, setPatientMobility] = useState<string>(conversation.lead?.patientMobility || initialMeta.patientMobility || 'Needs Partial Assistance (Walker / Cane)');
  const [palliativeCareUrgency, setPalliativeCareUrgency] = useState<string>(initialMeta.palliativeCareUrgency || 'MEDIUM');
  const [palliativeCareNotes, setPalliativeCareNotes] = useState<string>(initialMeta.palliativeCareNotes || '');

  // Duration & Schedule
  const [engagementType, setEngagementType] = useState<string>(conversation.lead?.engagementType || initialMeta.engagementType || 'Regular Daily Care');
  const [careDurationCategory, setCareDurationCategory] = useState<string>(conversation.lead?.careDurationCategory || initialMeta.careDurationCategory || 'SHORT_TERM');
  const [careDuration, setCareDuration] = useState<string>(conversation.lead?.careDuration || initialMeta.careDuration || '7 days');
  const [careSchedule, setCareSchedule] = useState<string>(conversation.lead?.careSchedule || initialMeta.careSchedule || '12-hour care (Day shift: 8 AM - 8 PM)');

  // Location / Ambulance
  const [serviceAddress, setServiceAddress] = useState<string>(conversation.lead?.serviceAddress || initialMeta.serviceAddress || '');
  const [cityDistrict, setCityDistrict] = useState<string>(conversation.lead?.cityDistrict || initialMeta.cityDistrict || 'Chennai');
  const [postalCode, setPostalCode] = useState<string>(conversation.lead?.postalCode || initialMeta.postalCode || '');
  const [pickupLocation, setPickupLocation] = useState<string>(conversation.lead?.pickupLocation || initialMeta.pickupLocation || '');
  const [destinationLocation, setDestinationLocation] = useState<string>(conversation.lead?.destinationLocation || initialMeta.destinationLocation || '');
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Priority & Emergency
  const isAmbulance = selectedFoundation === 'AMBULANCE' || primaryService.toLowerCase().includes('ambulance');
  const [priority, setPriority] = useState<string>(isAmbulance ? 'EMERGENCY' : (conversation.priority || 'NORMAL').toUpperCase());
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [targetOverridePriority, setTargetOverridePriority] = useState('NORMAL');

  // Live Notes Auto-Saving
  const [liveNotesText, setLiveNotesText] = useState<string>(
    initialMeta.liveNotes?.current || (conversation.lead?.notes as string) || ''
  );
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Classification suggestions
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [confidence, setConfidence] = useState<number>(conversation.classificationConfidence || 0.85);
  const [missingInfoList, setMissingInfoList] = useState<string[]>(conversation.missingInfo || []);

  // Lead Sync
  const [isSyncingLead, setIsSyncingLead] = useState(false);
  const [leadSyncSuccess, setLeadSyncSuccess] = useState(false);
  const [followupDate, setFollowupDate] = useState<string>('');

  // Call Initiation state
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // Fetch catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        setIsLoadingCatalog(true);
        const res = await apiFetch(`/api/v1/enquiry/catalog`);
        if (res.ok) {
          const data = await res.json();
          setFoundations(data.foundations || []);
          setCatalogItems(data.items || []);
          setCareConfig(data.config || null);
        }
      } catch (err) {
        console.error('Failed to load service catalog:', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Normalize phone number to E.164
  const rawPhone = conversation.customerPhone || (conversation.customerName?.match(/(\+?\d[\d\s-]{8,})/)?.[0]) || '';
  const cleanPhone = rawPhone.replace(/[^\d+]/g, '');
  const hasValidPhone = cleanPhone.length >= 10;

  // Auto-set priority to EMERGENCY when ambulance is selected
  useEffect(() => {
    if (isAmbulance && priority !== 'EMERGENCY') {
      setPriority('EMERGENCY');
    }
  }, [isAmbulance]);

  // Live Notes Auto-Save effect with debounce (800ms)
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    // Don't auto-save on initial mount if empty
    if (!liveNotesText) return;

    setSaveStatus('SAVING');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/v1/enquiry/live-notes/conversation/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: liveNotesText,
            authorName: 'Agent',
          }),
        });

        if (res.ok) {
          setSaveStatus('SAVED');
          setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          setSaveStatus('FAILED');
        }
      } catch (e) {
        console.error('Live note auto-save failed:', e);
        setSaveStatus('FAILED');
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [liveNotesText, conversation.id]);

  // Trigger Intelligent AI Classification
  const runAiClassification = async () => {
    try {
      setAiAnalyzing(true);
      const res = await apiFetch(`/api/v1/enquiry/conversations/${conversation.id}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSuggestion(data);
        if (data.foundation) setSelectedFoundation(data.foundation);
        if (data.enquiryCategory) setEnquiryCategory(data.enquiryCategory);
        if (data.primaryService) setPrimaryService(data.primaryService);
        if (data.subServices && data.subServices.length > 0) setSelectedSubServices(data.subServices);
        if (data.patientName && !patientName) setPatientName(data.patientName);
        if (data.patientAge && !patientAge) setPatientAge(String(data.patientAge));
        if (data.priority) setPriority(data.priority);
        setConfidence(data.confidence || 0.85);
        setMissingInfoList(data.missingInfo || []);
      }
    } catch (e) {
      console.error('Failed to classify conversation:', e);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Save full enquiry classification to backend
  const handleSaveClassification = async () => {
    try {
      setSaveStatus('SAVING');
      const payload: any = {
        foundation: selectedFoundation,
        enquiryCategory,
        primaryService,
        subServices: selectedSubServices,
        patientName,
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
        patientConditions,
        patientMobility,
        engagementType,
        careDurationCategory,
        careDuration,
        careSchedule,
        serviceAddress,
        cityDistrict,
        postalCode,
        pickupLocation,
        destinationLocation,
        priority,
        classificationConfidence: confidence,
        isClassificationConfirmed: true,
        missingInfo: missingInfoList,
        notes: liveNotesText,
      };

      const res = await apiFetch(`/api/v1/enquiry/conversations/${conversation.id}/classification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveStatus('SAVED');
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        const updated = await res.json();
        if (onUpdateConversation) onUpdateConversation(updated);
      } else {
        setSaveStatus('FAILED');
      }
    } catch (err) {
      console.error('Error saving classification:', err);
      setSaveStatus('FAILED');
    }
  };

  // Lead Sync / Create
  const handleSyncLead = async () => {
    try {
      setIsSyncingLead(true);
      const res = await apiFetch(`/api/v1/enquiry/conversations/${conversation.id}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: conversation.customerName,
          phone: cleanPhone || undefined,
          email: conversation.customerEmail || undefined,
          foundation: selectedFoundation,
          enquiryCategory,
          primaryService,
          subServices: selectedSubServices,
          patientName,
          patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
          patientConditions,
          patientMobility,
          engagementType,
          careDurationCategory,
          careDuration,
          careSchedule,
          serviceAddress,
          cityDistrict,
          postalCode,
          pickupLocation,
          destinationLocation,
          notes: liveNotesText,
          priority,
        }),
      });

      if (res.ok) {
        const lead = await res.json();
        setLeadSyncSuccess(true);
        setTimeout(() => setLeadSyncSuccess(false), 4000);
        if (onUpdateConversation) {
          onUpdateConversation({ ...conversation, leadId: lead.id, lead });
        }
      }
    } catch (err) {
      console.error('Failed to sync lead:', err);
    } finally {
      setIsSyncingLead(false);
    }
  };

  // Browser Geolocation capture
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGeolocating(false);
        const coords = `Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)}`;
        setServiceAddress((prev) => (prev ? `${prev} (${coords})` : coords));
      },
      (err) => {
        setIsGeolocating(false);
        console.warn('Geolocation error:', err.message);
      },
      { timeout: 10000 }
    );
  };

  // Click-to-Call Initiation
  const handleInitiateCall = async () => {
    if (!hasValidPhone) return;
    try {
      setIsCalling(true);
      setCallError(null);
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('paramantra_access_token') : '';

      const res = await apiFetch(`/telephony/calls/outbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: cleanPhone,
          leadId: conversation.leadId || undefined,
          conversationId: conversation.id,
          agentId: 'current-agent',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCall({
          callSid: data.roomName,
          roomName: data.roomName,
          phone: cleanPhone,
          customerName: conversation.customerName,
          token: data.token,
          serverUrl: data.serverUrl || data.wsUrl,
          wsUrl: data.wsUrl || data.serverUrl,
          leadId: conversation.leadId,
          direction: 'outbound',
          accepted: true,
          status: 'CONNECTING',
        });
      } else {
        setCallError(data.message || 'Call initiation failed.');
      }
    } catch (e: any) {
      console.error('Failed to start outbound call:', e);
      setCallError('Network error starting outbound call.');
    } finally {
      setIsCalling(false);
    }
  };

  // Emergency override submission
  const handleEmergencyOverride = async () => {
    if (!overrideReason || overrideReason.trim().length < 5) {
      alert('Please enter a descriptive override reason.');
      return;
    }

    try {
      const res = await apiFetch(`/api/v1/enquiry/emergency/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          leadId: conversation.leadId || undefined,
          newPriority: targetOverridePriority,
          overrideReason,
        }),
      });

      if (res.ok) {
        setPriority(targetOverridePriority);
        setShowOverrideModal(false);
        setOverrideReason('');
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to override priority.');
      }
    } catch (e) {
      console.error('Emergency override failed:', e);
    }
  };

  // Filter service items by selected foundation
  const currentFoundationObj = foundations.find(f => f.key === selectedFoundation);
  const foundationServices = currentFoundationObj?.services || catalogItems.filter(i => i.foundationKey === selectedFoundation);
  const filteredServices = foundationServices.filter((s: any) => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()))
  );

  return (
    <div className={`flex flex-col bg-[#070b0e] border-l border-[#1a2329] text-slate-200 text-xs h-full overflow-hidden select-text ${className}`}>
      {/* 1. HEADER & CLICK-TO-CALL BANNER */}
      <div className="p-4 border-b border-[#1a2329] bg-[#0c1217] shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">Enquiry Intelligence</span>
          </div>

          {/* AI Suggestion Button */}
          <button
            onClick={runAiClassification}
            disabled={aiAnalyzing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-semibold transition-colors disabled:opacity-50 text-[10px]"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiAnalyzing ? 'animate-spin' : 'text-purple-400'}`} />
            {aiAnalyzing ? 'Analyzing...' : 'AI Suggest'}
          </button>
        </div>

        {/* Contact Bar with Click-to-Call */}
        <div className="flex items-center justify-between bg-[#111920] border border-[#22313d] rounded-xl p-3 shadow-inner">
          <div className="min-w-0 pr-2">
            <h4 className="font-bold text-white text-sm truncate">{conversation.customerName}</h4>
            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
              <Phone className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="font-mono text-xs">{hasValidPhone ? cleanPhone : 'No verified phone'}</span>
            </div>
          </div>

          {/* Click to Call Action */}
          <button
            onClick={handleInitiateCall}
            disabled={!hasValidPhone || isCalling}
            title={hasValidPhone ? `Click to call ${cleanPhone} via LiveKit/Vobiz` : 'No valid phone number for this profile'}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold transition-all shadow-md shrink-0 ${
              hasValidPhone
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Phone className={`w-3.5 h-3.5 ${isCalling ? 'animate-bounce' : ''}`} />
            <span>{isCalling ? 'Calling...' : 'Call'}</span>
          </button>
        </div>

        {callError && (
          <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{callError}</span>
          </div>
        )}

        {/* Ambulance Emergency Alert Banner */}
        {isAmbulance && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/50 text-rose-200 flex flex-col gap-1 shadow-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 uppercase tracking-wide text-[11px]">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>AMBULANCE EMERGENCY ENQUIRY</span>
              </div>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="text-[9px] underline text-rose-300 hover:text-white"
              >
                Override Priority
              </button>
            </div>
            <p className="text-[10px] text-rose-200/80 leading-tight">
              Priority is locked to EMERGENCY. <strong>Notice:</strong> Dispatch staff must also initiate local emergency services (108) immediately.
            </p>
          </div>
        )}

        {/* AI Confidence & Missing Info Checklist */}
        {missingInfoList.length > 0 && (
          <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Missing Intake Details ({missingInfoList.length})
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                {Math.round(confidence * 100)}% Confident
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {missingInfoList.map((item, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 text-[9px] border border-amber-500/20">
                  • {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. SUB-TABS NAVIGATION */}
      <div className="flex border-b border-[#1a2329] bg-[#090e12] shrink-0 text-center font-semibold text-[11px]">
        <button
          onClick={() => setActiveTab('classification')}
          className={`flex-1 py-2.5 border-b-2 transition-colors ${
            activeTab === 'classification'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Catalog & Service
        </button>
        <button
          onClick={() => setActiveTab('patient')}
          className={`flex-1 py-2.5 border-b-2 transition-colors ${
            activeTab === 'patient'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Patient & Location
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2.5 border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Notes & Lead
        </button>
      </div>

      {/* 3. TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* TAB 1: CLASSIFICATION & SERVICE CATALOG */}
        {activeTab === 'classification' && (
          <div className="space-y-4">
            {/* Foundation / Business Unit Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Foundation / Service Provider
              </label>
              <select
                value={selectedFoundation}
                onChange={(e) => {
                  setSelectedFoundation(e.target.value);
                  setPrimaryService('');
                  setSelectedSubServices([]);
                }}
                className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-colors"
              >
                {foundations.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Enquiry Category */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Enquiry Category
              </label>
              <select
                value={enquiryCategory}
                onChange={(e) => setEnquiryCategory(e.target.value)}
                className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-2 text-white font-medium outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="SERVICE_ENQUIRY">Service Enquiry</option>
                <option value="JOB_ENQUIRY">Job Enquiry / Careers</option>
                <option value="VOLUNTEER_ENQUIRY">Volunteer Enquiry</option>
                <option value="DONOR_ENQUIRY">Donor Enquiry</option>
                <option value="GENERAL_ENQUIRY">General Enquiry</option>
                <option value="COMPLAINT_OR_SUPPORT">Complaint / Support</option>
              </select>
            </div>

            {/* Service Catalog Selection (Searchable & Checkboxes) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Services ({filteredServices.length})
                </label>
                <span className="text-[9px] text-slate-500">Multi-select enabled</span>
              </div>

              {/* Search Box */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search available services..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Service List */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar p-1 bg-[#0b1014] border border-[#1d2730] rounded-xl">
                {isLoadingCatalog ? (
                  <div className="p-4 text-center text-slate-500">Loading catalog...</div>
                ) : filteredServices.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">No services match filter</div>
                ) : (
                  filteredServices.map((service: any) => {
                    const isSelected = primaryService === service.name || selectedSubServices.includes(service.name);
                    return (
                      <div
                        key={service.id || service.name}
                        onClick={() => {
                          if (primaryService === service.name) {
                            setPrimaryService('');
                          } else {
                            setPrimaryService(service.name);
                            if (service.subServices && service.subServices.length > 0) {
                              setSelectedSubServices(service.subServices);
                            }
                          }
                        }}
                        className={`p-2 rounded-lg cursor-pointer flex items-start gap-2.5 transition-all border ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#111920] border-transparent hover:border-[#263542] text-slate-300'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs flex items-center gap-1.5">
                            <span className="truncate">{service.name}</span>
                            {service.isEmergency && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30">
                                EMERGENCY
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Subservices chips */}
            {primaryService && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Specific Subservices
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {currentFoundationObj?.services?.find((s: any) => s.name === primaryService)?.subServices?.map((sub: string) => {
                    const isSubChecked = selectedSubServices.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          if (isSubChecked) {
                            setSelectedSubServices(selectedSubServices.filter(s => s !== sub));
                          } else {
                            setSelectedSubServices([...selectedSubServices, sub]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                          isSubChecked
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-[#111920] border-[#22313d] text-slate-400 hover:text-white'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditional Palliative Care Section */}
            {primaryService.toLowerCase().includes('palliative') && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                  <HeartPulse className="w-4 h-4 text-purple-400" />
                  <span>Palliative Care Clinical Intake</span>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Care Urgency Level</label>
                  <select
                    value={palliativeCareUrgency}
                    onChange={(e) => setPalliativeCareUrgency(e.target.value)}
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ROUTINE">Routine Palliative Support (Within 24-48h)</option>
                    <option value="URGENT">Urgent Symptom Control (Within 4-8h)</option>
                    <option value="CRITICAL">Critical Comfort Care (Immediate Doctor/Nurse dispatch)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Pain & Symptom Notes</label>
                  <textarea
                    rows={2}
                    value={palliativeCareNotes}
                    onChange={(e) => setPalliativeCareNotes(e.target.value)}
                    placeholder="Document current pain score, medication regimen, nausea/dyspnea..."
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg p-2 text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PATIENT & LOCATION */}
        {activeTab === 'patient' && (
          <div className="space-y-3.5">
            {/* Patient Name & Age */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Patient / Client Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramachandran"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 78"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Health Conditions */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Known Health Conditions
              </label>
              <input
                type="text"
                placeholder="e.g. Hypertension, Dementia stage 2, Diabetes"
                value={patientConditions}
                onChange={(e) => setPatientConditions(e.target.value)}
                className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Mobility Requirements */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Mobility & Assistance Level
              </label>
              <select
                value={patientMobility}
                onChange={(e) => setPatientMobility(e.target.value)}
                className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="Fully Independent">Fully Independent</option>
                <option value="Needs Partial Assistance (Walker / Cane)">Needs Partial Assistance (Walker / Cane)</option>
                <option value="Wheelchair Bound">Wheelchair Bound</option>
                <option value="Bedridden (Requires Complete Assistance)">Bedridden (Requires Complete Assistance)</option>
              </select>
            </div>

            {/* Duration Category & Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Duration Category
                </label>
                <select
                  value={careDurationCategory}
                  onChange={(e) => setCareDurationCategory(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="DAY_CARE">Day Care (Single day / scholar)</option>
                  <option value="SHORT_TERM">Short-term Care (&le; 30 days)</option>
                  <option value="LONG_TERM">Long-term Care (&gt; 30 days)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Requested Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7 days, 3 months"
                  value={careDuration}
                  onChange={(e) => setCareDuration(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Engagement Type & Schedule */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Engagement Type
                </label>
                <select
                  value={engagementType}
                  onChange={(e) => setEngagementType(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="One-time Care">One-time Care</option>
                  <option value="Regular Daily Care">Regular Daily Care</option>
                  <option value="Day Care / Day Scholar">Day Care / Day Scholar</option>
                  <option value="Residential Care">Residential Care</option>
                  <option value="Shift-based Care">Shift-based Care</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Care Schedule
                </label>
                <select
                  value={careSchedule}
                  onChange={(e) => setCareSchedule(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="12-hour care (Day shift: 8 AM - 8 PM)">12h Day Shift (8 AM - 8 PM)</option>
                  <option value="12-hour care (Night shift: 8 PM - 8 AM)">12h Night Shift (8 PM - 8 AM)</option>
                  <option value="24-hour care (Full-day live-in)">24h Live-in Attendant</option>
                  <option value="Daytime schedule">Daytime Schedule</option>
                  <option value="Night-time schedule">Night-time Schedule</option>
                  <option value="Custom shift">Custom Shift</option>
                </select>
              </div>
            </div>

            {/* Conditional Ambulance Locations vs Home Address */}
            {isAmbulance ? (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs">
                  <MapPin className="w-4 h-4" />
                  <span>Ambulance Dispatch Locations</span>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Pickup Location</label>
                  <input
                    type="text"
                    placeholder="Exact address or landmark for pickup"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Destination Hospital / Clinic</label>
                  <input
                    type="text"
                    placeholder="Target receiving medical facility"
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Service Address
                  </label>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={isGeolocating}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {isGeolocating ? 'Locating...' : 'Capture GPS Pin'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Street address, apartment name, landmark"
                  value={serviceAddress}
                  onChange={(e) => setServiceAddress(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="City / District"
                    value={cityDistrict}
                    onChange={(e) => setCityDistrict(e.target.value)}
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE NOTES & LEAD MANAGEMENT */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Live Notes Area with Auto-Save */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Live Notes (Auto-Saved)
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  {saveStatus === 'SAVING' && (
                    <span className="text-amber-400 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                  {saveStatus === 'SAVED' && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saved {lastSavedAt}
                    </span>
                  )}
                  {saveStatus === 'FAILED' && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Save Failed
                    </span>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={liveNotesText}
                onChange={(e) => setLiveNotesText(e.target.value)}
                placeholder="Type customer notes, clinical instructions, doctor follow-ups... Automatically saved to database."
                className="w-full bg-[#111920] border border-[#22313d] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            {/* Follow-up Date Scheduling */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Schedule Follow-up
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full bg-[#111920] border border-[#22313d] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Lead Association & Creation */}
            <div className="p-3 bg-[#111920] border border-[#22313d] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lead Pool Status
                </span>
                {conversation.leadId ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Linked to Lead
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                    Unlinked Enquiry
                  </span>
                )}
              </div>

              <p className="text-[10px] text-slate-400 mb-3">
                {conversation.leadId 
                  ? `Synchronized with Lead #${conversation.leadId.slice(0, 8)}...`
                  : 'Convert this conversation into an official CRM Lead in the shared team pool.'}
              </p>

              <button
                type="button"
                onClick={handleSyncLead}
                disabled={isSyncingLead}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
              >
                {isSyncingLead ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Synchronizing...
                  </>
                ) : leadSyncSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    Lead Synchronized!
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    {conversation.leadId ? 'Update Synced Lead' : 'Create / Link Lead'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. FOOTER SAVE ACTIONS */}
      <div className="p-3 bg-[#0c1217] border-t border-[#1a2329] shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span>Priority:</span>
          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
            priority === 'EMERGENCY' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' :
            priority === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
            'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {priority}
          </span>
        </div>

        <button
          onClick={handleSaveClassification}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/40 transition-all active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* 5. EMERGENCY PRIORITY OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0e161c] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <span>Override Emergency Priority</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Ambulance enquiries are protected by server-side rules. Downgrading priority requires supervisor authorization and a recorded audit reason.
            </p>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">New Priority</label>
              <select
                value={targetOverridePriority}
                onChange={(e) => setTargetOverridePriority(e.target.value)}
                className="w-full bg-[#141f27] border border-[#2b3c4a] rounded-lg p-2 text-xs text-white"
              >
                <option value="HIGH">High Priority</option>
                <option value="NORMAL">Normal Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Mandatory Override Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Enquirer confirmed false alarm; patient already safely reached hospital."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full bg-[#141f27] border border-[#2b3c4a] rounded-lg p-2 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmergencyOverride}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md"
              >
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
