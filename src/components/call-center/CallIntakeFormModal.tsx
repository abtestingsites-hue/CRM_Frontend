"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Phone, HeartPulse, MapPin, Calendar, Clock, 
  Save, AlertCircle, ShieldAlert, Check, RefreshCw, FileText, CheckCircle2,
  Square, CheckSquare, Sparkles, User
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export interface CallIntakeFormModalProps {
  callSid?: string;
  customerName?: string;
  phoneNumber?: string;
  leadId?: string;
  initialData?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (lead?: any) => void;
}

export function CallIntakeFormModal({
  callSid,
  customerName = '',
  phoneNumber = '',
  leadId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: CallIntakeFormModalProps) {
  // Service catalog state
  const [foundations, setFoundations] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [careConfig, setCareConfig] = useState<any>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Form Fields
  const [enquirerName, setEnquirerName] = useState(customerName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [enquiryCategory, setEnquiryCategory] = useState('SERVICE_ENQUIRY');
  const [primaryService, setPrimaryService] = useState('');
  const [selectedSubServices, setSelectedSubServices] = useState<string[]>([]);

  // Patient Fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientConditions, setPatientConditions] = useState('');
  const [patientMobility, setPatientMobility] = useState('Needs Partial Assistance (Walker / Cane)');

  // Duration & Schedule
  const [engagementType, setEngagementType] = useState('Regular Daily Care');
  const [careDurationCategory, setCareDurationCategory] = useState('SHORT_TERM');
  const [careDuration, setCareDuration] = useState('7 days');
  const [careSchedule, setCareSchedule] = useState('12-hour care (Day shift: 8 AM - 8 PM)');

  // Live Notes Auto-Save
  const [liveNotesText, setLiveNotesText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Follow-up and disposition
  const [callOutcome, setCallOutcome] = useState('COMPLETED');
  const [followupDate, setFollowupDate] = useState('');
  const [callbackRequired, setCallbackRequired] = useState(false);
  const [callbackPriority, setCallbackPriority] = useState('NORMAL');

  // Location / Ambulance
  const [serviceAddress, setServiceAddress] = useState('');
  const [cityDistrict, setCityDistrict] = useState('Chennai');
  const [postalCode, setPostalCode] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setIsLoadingCatalog(true);
        const res = await apiFetch(`/api/v1/enquiry/catalog`);
        if (res.ok) {
          const data = await res.json();
          setFoundations(data.foundations || []);
          setCatalogItems(data.items || []);
          setCareConfig(data.config || null);
        }
      } catch (e) {
        console.error('Failed to load catalog in intake form:', e);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    if (isOpen) fetchCatalog();
  }, [isOpen]);

  // E.164 phone normalization helper
  const normalizePhoneNumber = (raw?: string | null): string => {
    if (!raw) return '';
    let clean = raw.trim();
    try { clean = decodeURIComponent(clean); } catch (_) {}
    const lower = clean.toLowerCase();
    if (['unknown', 'anonymous', 'withheld', 'internal', 'private', 'none'].includes(lower)) {
      return '';
    }
    let digits = clean.replace(/[^\d+]/g, '');
    if (digits.startsWith('00')) digits = '+' + digits.substring(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = '+91' + digits.substring(1);
    else if (!digits.startsWith('+') && digits.length === 10) digits = '+91' + digits;
    else if (!digits.startsWith('+') && digits.startsWith('91') && digits.length === 12) digits = '+' + digits;
    return digits.length >= 7 ? digits : '';
  };

  // Synchronize customer phone and name whenever callSid, initialData, or props change
  useEffect(() => {
    if (initialData) {
      setEnquirerName(initialData.customerName || customerName || '');
      setPhone(normalizePhoneNumber(initialData.phoneNumber || phoneNumber));
      setEmail(initialData.email || '');
      if (initialData.serviceInterest || initialData.primaryService) {
        setSelectedCategory(initialData.serviceInterest || initialData.primaryService);
        setPrimaryService(initialData.primaryService || initialData.serviceInterest || '');
      }
      if (initialData.subServices) setSelectedSubServices(initialData.subServices);
      if (initialData.patientName) setPatientName(initialData.patientName);
      if (initialData.patientAge) setPatientAge(String(initialData.patientAge));
      if (initialData.patientConditions) setPatientConditions(initialData.patientConditions);
      if (initialData.patientMobility) setPatientMobility(initialData.patientMobility);
      if (initialData.engagementType) setEngagementType(initialData.engagementType);
      if (initialData.careDurationCategory) setCareDurationCategory(initialData.careDurationCategory);
      if (initialData.careDuration) setCareDuration(initialData.careDuration);
      if (initialData.careSchedule) setCareSchedule(initialData.careSchedule);
      if (initialData.serviceAddress) setServiceAddress(initialData.serviceAddress);
      if (initialData.cityDistrict) setCityDistrict(initialData.cityDistrict);
      if (initialData.postalCode) setPostalCode(initialData.postalCode);
      if (initialData.notes) setLiveNotesText(initialData.notes);
    } else {
      const normalized = normalizePhoneNumber(phoneNumber);
      setPhone(normalized);
      if (customerName && customerName !== 'Customer' && customerName !== 'Unknown Caller') {
        setEnquirerName(customerName);
      } else {
        setEnquirerName('');
      }
    }
  }, [callSid, phoneNumber, customerName, initialData, isOpen]);

  // Dynamically compute canonical service categories from foundations & catalogItems
  const categories = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; foundationKey: string; foundationName: string }>();

    // Add categories from foundations
    foundations.forEach((f) => {
      const catId = f.category || f.name;
      if (!map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: f.name ? `${f.name} — ${f.category || ''}`.replace(/ — $/, '') : catId,
          foundationKey: f.key,
          foundationName: f.name,
        });
      }
    });

    // Add any remaining categories from catalogItems
    catalogItems.forEach((item) => {
      const catId = item.category || item.foundationName || item.foundationKey;
      if (catId && !map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: item.foundationName ? `${item.foundationName} — ${item.category}` : catId,
          foundationKey: item.foundationKey,
          foundationName: item.foundationName || catId,
        });
      }
    });

    return Array.from(map.values());
  }, [foundations, catalogItems]);

  // Set default category once categories load if not yet selected
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  const currentCategoryObj = categories.find((c) => c.id === selectedCategory);

  // Filter available services for chosen category and deduplicate identical labels
  const availableServices = React.useMemo(() => {
    if (!selectedCategory) return [];
    const catObj = categories.find((c) => c.id === selectedCategory);
    const matching = catalogItems.filter(
      (item) => item.category === selectedCategory || (catObj && item.foundationKey === catObj.foundationKey)
    );

    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const s of matching) {
      const key = (s.code || s.name).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(s);
      }
    }
    return deduped;
  }, [selectedCategory, categories, catalogItems]);

  const selectedServiceObj = availableServices.find((s) => s.name === primaryService);

  // Check emergency state
  const isAmbulance = Boolean(
    (currentCategoryObj && currentCategoryObj.foundationKey === 'AMBULANCE') ||
    selectedCategory.toLowerCase().includes('ambulance') ||
    selectedCategory.toLowerCase().includes('emergency') ||
    primaryService.toLowerCase().includes('ambulance') ||
    selectedSubServices.some((s) => s.toLowerCase().includes('ambulance'))
  );

  // Live notes debounced auto-save
  useEffect(() => {
    if (!liveNotesText || !callSid) return;
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);

    setSaveStatus('SAVING');
    notesTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/v1/enquiry/live-notes/call/${callSid}`, {
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
        setSaveStatus('FAILED');
      }
    }, 800);

    return () => {
      if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    };
  }, [liveNotesText, callSid]);

  if (!isOpen) return null;

  // Submit complete call intake
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validate category and service compatibility
    if (primaryService && !availableServices.some((s) => s.name === primaryService)) {
      setErrorMessage('Please select a valid service belonging to the selected category.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        leadId: leadId || undefined,
        enquirerName,
        phone,
        email: email || undefined,
        serviceCategory: selectedCategory,
        foundation: currentCategoryObj?.foundationKey || undefined,
        enquiryCategory,
        primaryService,
        subServices: selectedSubServices,
        patientName: patientName || undefined,
        patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
        patientConditions: patientConditions || undefined,
        patientMobility,
        engagementType,
        careDurationCategory,
        careDuration,
        careSchedule,
        serviceAddress: isAmbulance ? undefined : serviceAddress,
        cityDistrict: isAmbulance ? undefined : cityDistrict,
        postalCode: isAmbulance ? undefined : postalCode,
        pickupLocation: isAmbulance ? pickupLocation : undefined,
        destinationLocation: isAmbulance ? destinationLocation : undefined,
        liveNotes: liveNotesText,
        callOutcome,
        followupDate: followupDate ? new Date(followupDate).toISOString() : undefined,
        callbackRequired,
        callbackPriority,
      };

      let endpoint = '/api/v1/enquiry/leads/intake';
      let method = 'POST';

      if (callSid) {
        endpoint = `/api/v1/enquiry/calls/${callSid}/intake`;
        method = 'PATCH';
      } else if (leadId) {
        endpoint = `/api/v1/enquiry/leads/${leadId}/intake`;
        method = 'PATCH';
      }

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (onSuccess) onSuccess(data.lead);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || err.error || 'Failed to persist enquiry intake form.');
      }
    } catch (e: any) {
      console.error('Call intake submit error:', e);
      setErrorMessage('Network error persisting call intake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#0b1015] border border-[#1e2933] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-4 px-6 border-b border-[#1e2933] bg-[#0f171f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {callSid ? 'Call Intake & Structured Disposition' : leadId ? 'Edit Lead Enquiry & Structured Intake' : 'New Lead Enquiry Intake'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {callSid ? `Call ID: ${callSid.slice(0, 24)}...` : leadId ? `Lead ID: ${leadId.slice(0, 8)}...` : 'Manual Structured Entry'} • Direct CRM Database Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            <span>Mandatory Intake • Submit to Complete</span>
          </div>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ambulance Emergency Alert */}
          {isAmbulance && (
            <div className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-200 flex items-center gap-2.5 shadow-lg animate-pulse">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-[11px]">
                <strong className="text-white uppercase">EMERGENCY PRIORITY LOCKED:</strong> An Ambulance service is selected. Please also trigger local emergency ambulance services (108) immediately.
              </div>
            </div>
          )}

          {/* CONTACT & SERVICE CATEGORY DETAILS */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              Contact & Service Category Information
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Enquirer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Caller or contact name"
                  value={enquirerName}
                  onChange={(e) => setEnquirerName(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Primary Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="contact@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Service Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPrimaryService('');
                    setSelectedSubServices([]);
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-orange-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Enquiry Category</label>
                <select
                  value={enquiryCategory}
                  onChange={(e) => setEnquiryCategory(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-orange-500"
                >
                  <option value="SERVICE_ENQUIRY">Service Enquiry</option>
                  <option value="JOB_ENQUIRY">Job Enquiry / Careers</option>
                  <option value="VOLUNTEER_ENQUIRY">Volunteer Enquiry</option>
                  <option value="DONOR_ENQUIRY">Donor Enquiry</option>
                  <option value="GENERAL_ENQUIRY">General Enquiry</option>
                  <option value="COMPLAINT_OR_SUPPORT">Complaint / Support</option>
                </select>
              </div>
            </div>
          </div>

          {/* SERVICE CATALOG SELECTION */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              Requested Services ({currentCategoryObj?.name || selectedCategory || 'Category'})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1.5 bg-[#0e161d] border border-[#1c2936] rounded-xl">
              {availableServices.length > 0 ? (
                availableServices.map((service: any) => {
                  const isSelected = primaryService === service.name;
                  return (
                    <div
                      key={service.id || service.code || service.name}
                      onClick={() => {
                        if (primaryService === service.name) {
                          setPrimaryService('');
                          setSelectedSubServices([]);
                        } else {
                          setPrimaryService(service.name);
                          if (service.subServices && Array.isArray(service.subServices)) {
                            setSelectedSubServices(service.subServices);
                          } else {
                            setSelectedSubServices([]);
                          }
                        }
                      }}
                      className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                          : 'bg-[#121b24] border-transparent hover:border-[#27394a] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                        <span className="font-semibold text-xs">{service.name}</span>
                      </div>
                      {service.isEmergency && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-6 text-center text-slate-500 text-xs">
                  {isLoadingCatalog ? 'Loading service catalog...' : 'No services available for this category.'}
                </div>
              )}
            </div>

            {/* Included Sub-Services Scope Toggle */}
            {selectedServiceObj && selectedServiceObj.subServices && selectedServiceObj.subServices.length > 0 && (
              <div className="p-2.5 bg-[#0e161d] border border-[#1c2936] rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Included Sub-Services / Scope for {selectedServiceObj.name}:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedServiceObj.subServices.map((sub: string) => {
                    const isSubSelected = selectedSubServices.includes(sub);
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => {
                          if (isSubSelected) {
                            setSelectedSubServices(selectedSubServices.filter((s) => s !== sub));
                          } else {
                            setSelectedSubServices([...selectedSubServices, sub]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                          isSubSelected
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                            : 'bg-[#121b24] border-[#223342] text-slate-400 hover:text-white'
                        }`}
                      >
                        {isSubSelected ? <Check className="w-3 h-3 text-orange-400" /> : <Square className="w-3 h-3 text-slate-500" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* PATIENT / ELDER & CLINICAL REQUIREMENTS */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              Patient / Elder Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Patient Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Meenakshi Ammal"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Age</label>
                <input
                  type="number"
                  placeholder="e.g. 74"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Health Conditions</label>
                <input
                  type="text"
                  placeholder="e.g. Post-stroke paralysis, bed sore stage 2"
                  value={patientConditions}
                  onChange={(e) => setPatientConditions(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Mobility Requirements</label>
                <select
                  value={patientMobility}
                  onChange={(e) => setPatientMobility(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="Fully Independent">Fully Independent</option>
                  <option value="Needs Partial Assistance (Walker / Cane)">Needs Partial Assistance (Walker / Cane)</option>
                  <option value="Wheelchair Bound">Wheelchair Bound</option>
                  <option value="Bedridden (Requires Complete Assistance)">Bedridden (Requires Complete Assistance)</option>
                </select>
              </div>
            </div>

            {/* Duration & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Engagement Type</label>
                <select
                  value={engagementType}
                  onChange={(e) => setEngagementType(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="One-time Care">One-time Care</option>
                  <option value="Regular Daily Care">Regular Daily Care</option>
                  <option value="Day Care / Day Scholar">Day Care / Day Scholar</option>
                  <option value="Residential Care">Residential Care</option>
                  <option value="Shift-based Care">Shift-based Care</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Duration Category</label>
                <select
                  value={careDurationCategory}
                  onChange={(e) => setCareDurationCategory(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="DAY_CARE">Day Care (Single day / scholar)</option>
                  <option value="SHORT_TERM">Short-term Care (&le; 30 days)</option>
                  <option value="LONG_TERM">Long-term Care (&gt; 30 days)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Care Schedule</label>
                <select
                  value={careSchedule}
                  onChange={(e) => setCareSchedule(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
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
          </div>

          {/* LOCATION DETAILS (HOME CARE vs AMBULANCE) */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              Service Location
            </h4>

            {isAmbulance ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">Ambulance Pickup Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Patient pickup address / landmark"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">Destination Hospital</label>
                  <input
                    type="text"
                    placeholder="Destination clinic or hospital name"
                    value={destinationLocation}
                    onChange={(e) => setDestinationLocation(e.target.value)}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Service Address</label>
                  <input
                    type="text"
                    placeholder="Street, flat/door number, landmark"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">City / District</label>
                  <input
                    type="text"
                    placeholder="City name"
                    value={cityDistrict}
                    onChange={(e) => setCityDistrict(e.target.value)}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. LIVE NOTES AUTO-SAVING */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Live Call Notes (Incremental Auto-Save)
              </h4>
              <div className="text-[10px]">
                {saveStatus === 'SAVING' && <span className="text-amber-400 animate-pulse flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Auto-saving...</span>}
                {saveStatus === 'SAVED' && <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Saved {lastSavedAt}</span>}
                {saveStatus === 'FAILED' && <span className="text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Save failed</span>}
              </div>
            </div>

            <textarea
              rows={3}
              value={liveNotesText}
              onChange={(e) => setLiveNotesText(e.target.value)}
              placeholder="Record live notes while speaking with customer... Notes are streamed to the call session record."
              className="w-full bg-[#121b24] border border-[#233342] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
            />
          </div>

          {/* DISPOSITION & FOLLOW-UP */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              Call Outcome & Scheduled Follow-up
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Call Outcome</label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="COMPLETED">Enquiry Completed / Order Placed</option>
                  <option value="FOLLOWUP_NEEDED">Follow-up Needed (Interested)</option>
                  <option value="CALLBACK_REQUESTED">Callback Requested by Customer</option>
                  <option value="PRICE_NEGOTIATION">Price / Package Negotiation</option>
                  <option value="UNANSWERED">Call Unanswered / Voicemail</option>
                  <option value="CANCELLED">Customer Cancelled Enquiry</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Schedule Follow-up Date & Time</label>
                <input
                  type="datetime-local"
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-[#1e2933] flex items-center justify-between">
            <span className="text-[11px] text-slate-400 italic">
              * Structured intake submission is mandatory to conclude this interaction.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-900/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Intake...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Persist Intake
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
