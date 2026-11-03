"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, Phone, HeartPulse, MapPin, Calendar, Clock, 
  Save, AlertCircle, ShieldAlert, Check, RefreshCw, FileText, CheckCircle2,
  Square, CheckSquare, Sparkles, User, Globe, Search, ArrowRight
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
  embedded?: boolean;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'IN', label: 'India (+91)' },
  { code: '+1', country: 'US', label: 'United States (+1)' },
  { code: '+44', country: 'GB', label: 'United Kingdom (+44)' },
  { code: '+971', country: 'AE', label: 'UAE (+971)' },
  { code: '+65', country: 'SG', label: 'Singapore (+65)' },
  { code: '+60', country: 'MY', label: 'Malaysia (+60)' },
  { code: '+61', country: 'AU', label: 'Australia (+61)' },
  { code: '+1', country: 'CA', label: 'Canada (+1)' },
  { code: '+49', country: 'DE', label: 'Germany (+49)' },
  { code: '+33', country: 'FR', label: 'France (+33)' },
  { code: '+966', country: 'SA', label: 'Saudi Arabia (+966)' },
  { code: '+974', country: 'QA', label: 'Qatar (+974)' },
  { code: '+968', country: 'OM', label: 'Oman (+968)' },
  { code: '+965', country: 'KW', label: 'Kuwait (+965)' },
  { code: '+973', country: 'BH', label: 'Bahrain (+973)' },
];

const ORGANIZATIONS = [
  { key: 'UEC', label: 'Universal Enterprise Care (UEC)' },
  { key: 'UNCF', label: 'Universal Newage Care Foundation (UNCF)' },
  { key: 'ACARE', label: 'ACare / Home Care' },
  { key: 'AMBULANCE', label: 'Ambulance & Emergency Services' },
  { key: 'UHC', label: 'Universal Health Care (UHC)' },
  { key: 'THATHA_PATTI', label: 'Thatha Patti Care Home' },
  { key: 'ZENCURA', label: 'Zencura Health' },
];

const ENQUIRY_CATEGORIES = [
  { value: 'SERVICE_ENQUIRY', label: 'Service Enquiry' },
  { value: 'JOB_ENQUIRY', label: 'Job Enquiry / Careers' },
  { value: 'VOLUNTEER_ENQUIRY', label: 'Volunteer Enquiry' },
  { value: 'DONOR_ENQUIRY', label: 'Donor Enquiry' },
  { value: 'GENERAL_ENQUIRY', label: 'General Enquiry' },
  { value: 'COMPLAINT_OR_SUPPORT', label: 'Complaint / Support' },
];

function splitPhoneAndCountryCode(raw?: string | null): { countryCode: string; number: string } {
  if (!raw) return { countryCode: '+91', number: '' };
  let clean = raw.trim();
  try { clean = decodeURIComponent(clean); } catch (_) {}
  const lower = clean.toLowerCase();
  if (['unknown', 'anonymous', 'withheld', 'internal', 'private', 'none'].includes(lower)) {
    return { countryCode: '+91', number: '' };
  }
  let digits = clean.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.substring(2);

  // Match known country code prefix
  for (const c of COUNTRY_CODES) {
    if (digits.startsWith(c.code)) {
      return { countryCode: c.code, number: digits.substring(c.code.length) };
    }
  }

  // Handle leading 0 or 10 digits
  if (digits.startsWith('0') && digits.length === 11) {
    return { countryCode: '+91', number: digits.substring(1) };
  }
  if (!digits.startsWith('+') && digits.length === 10) {
    return { countryCode: '+91', number: digits };
  }
  if (!digits.startsWith('+') && digits.startsWith('91') && digits.length === 12) {
    return { countryCode: '+91', number: digits.substring(2) };
  }
  return { countryCode: '+91', number: digits.replace(/^\+/, '') };
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
  embedded = false,
}: CallIntakeFormModalProps) {
  // Service catalog state
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Effective identifier for draft caching
  const effectiveSessionId = callSid || leadId || 'default_session';

  // Form Fields - Contact
  const [enquirerName, setEnquirerName] = useState(customerName || '');
  const [primaryCountryCode, setPrimaryCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [secondaryCountryCode, setSecondaryCountryCode] = useState('+91');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');

  // Service Hierarchy: Organization -> Enquiry Category -> Required Service
  const [selectedOrganization, setSelectedOrganization] = useState('UEC');
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

  // Structured Address Fields
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Chennai');
  const [state, setState] = useState('Tamil Nadu');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [isLookingUpPincode, setIsLookingUpPincode] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  // Ambulance specific
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');

  // Live Notes & Draft Auto-Save
  const [liveNotesText, setLiveNotesText] = useState('');
  const [draftStatus, setDraftStatus] = useState<'IDLE' | 'UNSAVED' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Disposition
  const [callOutcome, setCallOutcome] = useState('COMPLETED');
  const [followupDate, setFollowupDate] = useState('');
  const [callbackRequired, setCallbackRequired] = useState(false);
  const [callbackPriority, setCallbackPriority] = useState('NORMAL');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Track initialization to avoid overwriting user edits
  const initializedSessionRef = useRef<string | null>(null);
  const userHasEditedRef = useRef<boolean>(false);

  // Load catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setIsLoadingCatalog(true);
        const res = await apiFetch(`/api/v1/enquiry/catalog`);
        if (res.ok) {
          const data = await res.json();
          setCatalogItems(data.items || []);
        }
      } catch (e) {
        console.error('Failed to load catalog in intake form:', e);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    if (isOpen) fetchCatalog();
  }, [isOpen]);

  // Initialize or restore draft when session changes
  useEffect(() => {
    if (!isOpen) return;
    if (initializedSessionRef.current === effectiveSessionId) return;

    initializedSessionRef.current = effectiveSessionId;
    userHasEditedRef.current = false;

    // 1. Check local storage for existing draft
    let restoredFromDraft = false;
    try {
      const draftJson = localStorage.getItem(`crm_intake_draft_${effectiveSessionId}`);
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        if (draft && typeof draft === 'object') {
          if (draft.enquirerName) setEnquirerName(draft.enquirerName);
          if (draft.primaryCountryCode) setPrimaryCountryCode(draft.primaryCountryCode);
          if (draft.phone) setPhone(draft.phone);
          if (draft.secondaryCountryCode) setSecondaryCountryCode(draft.secondaryCountryCode);
          if (draft.secondaryPhone) setSecondaryPhone(draft.secondaryPhone);
          if (draft.email) setEmail(draft.email);
          if (draft.selectedOrganization) setSelectedOrganization(draft.selectedOrganization);
          if (draft.enquiryCategory) setEnquiryCategory(draft.enquiryCategory);
          if (draft.primaryService) setPrimaryService(draft.primaryService);
          if (draft.selectedSubServices) setSelectedSubServices(draft.selectedSubServices);
          if (draft.patientName) setPatientName(draft.patientName);
          if (draft.patientAge) setPatientAge(draft.patientAge);
          if (draft.patientConditions) setPatientConditions(draft.patientConditions);
          if (draft.patientMobility) setPatientMobility(draft.patientMobility);
          if (draft.engagementType) setEngagementType(draft.engagementType);
          if (draft.careDurationCategory) setCareDurationCategory(draft.careDurationCategory);
          if (draft.careDuration) setCareDuration(draft.careDuration);
          if (draft.careSchedule) setCareSchedule(draft.careSchedule);
          if (draft.street) setStreet(draft.street);
          if (draft.city) setCity(draft.city);
          if (draft.state) setState(draft.state);
          if (draft.country) setCountry(draft.country);
          if (draft.postalCode) setPostalCode(draft.postalCode);
          if (draft.pickupLocation) setPickupLocation(draft.pickupLocation);
          if (draft.destinationLocation) setDestinationLocation(draft.destinationLocation);
          if (draft.liveNotesText) setLiveNotesText(draft.liveNotesText);
          if (draft.callOutcome) setCallOutcome(draft.callOutcome);
          if (draft.followupDate) setFollowupDate(draft.followupDate);
          setDraftStatus('SAVED');
          restoredFromDraft = true;
        }
      }
    } catch (e) {
      console.warn('[Draft] Failed to load local draft:', e);
    }

    // 2. If no local draft, populate from initialData or props
    if (!restoredFromDraft) {
      if (initialData) {
        setEnquirerName(initialData.customerName || customerName || '');
        const parsed = splitPhoneAndCountryCode(initialData.phoneNumber || phoneNumber);
        setPrimaryCountryCode(parsed.countryCode);
        setPhone(parsed.number);
        const parsedSec = splitPhoneAndCountryCode(initialData.secondaryPhone);
        setSecondaryCountryCode(parsedSec.countryCode);
        setSecondaryPhone(parsedSec.number);
        setEmail(initialData.email || '');
        if (initialData.organization || initialData.foundation) {
          setSelectedOrganization(initialData.organization || initialData.foundation);
        }
        if (initialData.enquiryCategory) setEnquiryCategory(initialData.enquiryCategory);
        if (initialData.primaryService || initialData.serviceInterest) {
          setPrimaryService(initialData.primaryService || initialData.serviceInterest);
        }
        if (initialData.subServices) setSelectedSubServices(initialData.subServices);
        if (initialData.patientName) setPatientName(initialData.patientName);
        if (initialData.patientAge) setPatientAge(String(initialData.patientAge));
        if (initialData.patientConditions) setPatientConditions(initialData.patientConditions);
        if (initialData.patientMobility) setPatientMobility(initialData.patientMobility);
        if (initialData.street) setStreet(initialData.street);
        else if (initialData.serviceAddress) setStreet(initialData.serviceAddress);
        if (initialData.city) setCity(initialData.city);
        else if (initialData.cityDistrict) setCity(initialData.cityDistrict);
        if (initialData.state) setState(initialData.state);
        if (initialData.country) setCountry(initialData.country || 'India');
        if (initialData.postalCode) setPostalCode(initialData.postalCode);
        if (initialData.notes || initialData.liveNotes) setLiveNotesText(initialData.notes || initialData.liveNotes);
      } else {
        const parsed = splitPhoneAndCountryCode(phoneNumber);
        setPrimaryCountryCode(parsed.countryCode);
        setPhone(parsed.number);
        if (customerName && customerName !== 'Customer' && customerName !== 'Unknown Caller') {
          setEnquirerName(customerName);
        } else {
          setEnquirerName('');
        }
      }
    }
  }, [isOpen, effectiveSessionId, phoneNumber, customerName, initialData]);

  // Pincode lookup helper
  const handlePincodeLookup = useCallback(async (code: string, currentCountry: string) => {
    const clean = code.trim();
    if (!clean || clean.length < 5) return;
    setIsLookingUpPincode(true);
    setPincodeStatus(null);
    try {
      const res = await apiFetch(`/api/v1/enquiry/postal-lookup/${encodeURIComponent(clean)}?country=${encodeURIComponent(currentCountry)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && (data.city || data.state)) {
          if (data.city) setCity(data.city);
          if (data.state) setState(data.state);
          setPincodeStatus(`Verified: ${data.city || ''}, ${data.state || ''}`);
        } else {
          setPincodeStatus('Pincode not found in directory');
        }
      } else {
        setPincodeStatus('Lookup unavailable (manual entry allowed)');
      }
    } catch (e) {
      setPincodeStatus('Lookup error (manual entry allowed)');
    } finally {
      setIsLookingUpPincode(false);
    }
  }, []);

  // Trigger pincode lookup when 6 digits entered
  const handlePostalCodeChange = (val: string) => {
    setPostalCode(val);
    userHasEditedRef.current = true;
    setDraftStatus('UNSAVED');
    if (val.trim().length === 6 && country.toLowerCase() === 'india') {
      handlePincodeLookup(val, country);
    }
  };

  // Filter available services based on chosen Organization & Enquiry Category
  const availableServices = useMemo(() => {
    if (!catalogItems || catalogItems.length === 0) return [];
    
    // Normalize target foundation key
    const targetKey = selectedOrganization.toUpperCase();
    
    return catalogItems.filter((item) => {
      const itemKey = (item.foundationKey || item.foundation || '').toUpperCase();
      const itemCat = (item.category || '').toUpperCase();
      
      const matchesOrg = itemKey === targetKey || itemCat.includes(targetKey);
      return matchesOrg;
    });
  }, [selectedOrganization, catalogItems]);

  const isAmbulance = selectedOrganization === 'AMBULANCE' || primaryService.toLowerCase().includes('ambulance');

  // Debounced Autosave Draft Handler (both LocalStorage and Backend)
  useEffect(() => {
    if (!userHasEditedRef.current) return;
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);

    setDraftStatus('UNSAVED');

    draftTimeoutRef.current = setTimeout(async () => {
      setDraftStatus('SAVING');
      const draftPayload = {
        enquirerName,
        primaryCountryCode,
        phone,
        secondaryCountryCode,
        secondaryPhone,
        email,
        selectedOrganization,
        enquiryCategory,
        primaryService,
        selectedSubServices,
        patientName,
        patientAge,
        patientConditions,
        patientMobility,
        engagementType,
        careDurationCategory,
        careDuration,
        careSchedule,
        street,
        city,
        state,
        country,
        postalCode,
        pickupLocation,
        destinationLocation,
        liveNotesText,
        callOutcome,
        followupDate,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save to local storage
      try {
        localStorage.setItem(`crm_intake_draft_${effectiveSessionId}`, JSON.stringify(draftPayload));
      } catch (err) {
        console.warn('LocalStorage draft save error:', err);
      }

      // 2. Save to backend if callSid is available
      if (callSid) {
        try {
          const res = await apiFetch(`/api/v1/enquiry/calls/${callSid}/draft`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draftData: draftPayload }),
          });
          if (res.ok) {
            setDraftStatus('SAVED');
            setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          } else {
            setDraftStatus('FAILED');
          }
        } catch (e) {
          setDraftStatus('FAILED');
        }
      } else {
        setDraftStatus('SAVED');
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 800);

    return () => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    };
  }, [
    enquirerName, primaryCountryCode, phone, secondaryCountryCode, secondaryPhone, email,
    selectedOrganization, enquiryCategory, primaryService, selectedSubServices,
    patientName, patientAge, patientConditions, patientMobility,
    engagementType, careDurationCategory, careDuration, careSchedule,
    street, city, state, country, postalCode, pickupLocation, destinationLocation,
    liveNotesText, callOutcome, followupDate, effectiveSessionId, callSid
  ]);

  if (!isOpen) return null;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Compute normalized full numbers
    const cleanPrimaryDigits = phone.replace(/[^\d]/g, '');
    const fullPrimary = cleanPrimaryDigits ? `${primaryCountryCode}${cleanPrimaryDigits}` : '';

    const cleanSecDigits = secondaryPhone.replace(/[^\d]/g, '');
    const fullSecondary = cleanSecDigits ? `${secondaryCountryCode}${cleanSecDigits}` : '';

    // Full service address string
    const fullAddress = isAmbulance 
      ? pickupLocation 
      : [street, city, state, postalCode, country].filter(Boolean).join(', ');

    const payload = {
      leadId: leadId || undefined,
      enquirerName,
      phone: fullPrimary,
      countryCode: primaryCountryCode,
      secondaryPhone: fullSecondary || undefined,
      secondaryCountryCode: cleanSecDigits ? secondaryCountryCode : undefined,
      email: email || undefined,
      serviceCategory: selectedOrganization,
      foundation: selectedOrganization,
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
      street: isAmbulance ? undefined : street,
      city: isAmbulance ? undefined : city,
      state: isAmbulance ? undefined : state,
      country: isAmbulance ? undefined : country,
      postalCode: isAmbulance ? undefined : postalCode,
      serviceAddress: fullAddress,
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

    try {
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        // Clean draft on success
        try {
          localStorage.removeItem(`crm_intake_draft_${effectiveSessionId}`);
        } catch (_) {}
        userHasEditedRef.current = false;
        if (onSuccess) onSuccess(data.lead);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.message || err.error || 'Failed to persist enquiry intake form. Data has been preserved.');
      }
    } catch (e: any) {
      console.error('Call intake submit error:', e);
      setErrorMessage('Network error persisting call intake. Your entered data is preserved locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttemptClose = () => {
    if (userHasEditedRef.current && draftStatus === 'UNSAVED') {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  const innerContent = (
    <div className={`bg-[#0b1015] border border-[#1e2933] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200 text-xs ${
      embedded ? 'w-full h-full' : 'w-full max-w-4xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-200'
    }`}>
      {/* HEADER */}
      <div className="p-4 px-6 border-b border-[#1e2933] bg-[#0f171f] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>{callSid ? 'Customer Intake & Service Documentation' : leadId ? 'Edit Lead Intake & Services' : 'New Customer Intake Form'}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono">
                {selectedOrganization}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {callSid ? `Call ID: ${callSid.slice(0, 24)}...` : leadId ? `Lead ID: ${leadId.slice(0, 8)}...` : 'Manual Entry'} • Direct CRM Database Persistence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Draft Persistence Status */}
          <div className="text-[11px] font-medium flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
            {draftStatus === 'SAVING' && (
              <span className="text-amber-400 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Saving draft...
              </span>
            )}
            {draftStatus === 'SAVED' && (
              <span className="text-emerald-400 flex items-center gap-1" title={lastSavedAt ? `Saved at ${lastSavedAt}` : 'Draft saved'}>
                <Check className="w-3 h-3" /> Draft saved {lastSavedAt && `(${lastSavedAt})`}
              </span>
            )}
            {draftStatus === 'FAILED' && (
              <span className="text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Autosave failed (local cached)
              </span>
            )}
            {draftStatus === 'UNSAVED' && (
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Unsaved changes
              </span>
            )}
            {draftStatus === 'IDLE' && (
              <span className="text-slate-500">Draft ready</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAttemptClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            title="Close / Minimize Intake"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FORM BODY */}
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
              <strong className="text-white uppercase">EMERGENCY PRIORITY LOCKED:</strong> Ambulance / Emergency service active. Initiate local emergency dispatch (108) immediately.
            </div>
          </div>
        )}

        {/* 1. CONTACT & PHONE DETAILS WITH INDEPENDENT COUNTRY CODES */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1 flex items-center justify-between">
            <span>1. Contact & Phone Information</span>
            <span className="text-[10px] text-slate-500 normal-case font-normal">Primary number auto-synced from active call</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Enquirer Name */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Enquirer Full Name <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Caller / Contact name"
                value={enquirerName}
                onChange={(e) => {
                  setEnquirerName(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>

            {/* Primary Phone with Country Code Selector */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Primary Phone <span className="text-orange-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <select
                  value={primaryCountryCode}
                  onChange={(e) => {
                    setPrimaryCountryCode(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-28 bg-[#121b24] border border-[#233342] rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-orange-500 shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.country + c.code} value={c.code}>
                      {c.country} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="flex-1 min-w-0 bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Secondary Phone (Optional) with Independent Country Code */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Secondary Phone (Optional)
              </label>
              <div className="flex gap-1.5">
                <select
                  value={secondaryCountryCode}
                  onChange={(e) => {
                    setSecondaryCountryCode(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-28 bg-[#121b24] border border-[#233342] rounded-lg px-2 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-orange-500 shrink-0"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.country + c.code} value={c.code}>
                      {c.country} ({c.code})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Alternate phone"
                  value={secondaryPhone}
                  onChange={(e) => {
                    setSecondaryPhone(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="flex-1 min-w-0 bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="contact@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* 2. SERVICE HIERARCHY: ORGANIZATION -> ENQUIRY CATEGORY -> REQUIRED SERVICE */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
            2. Service Category Hierarchy
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Organization Dropdown (Strictly Organizations, NO services) */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Organization Unit <span className="text-orange-500">*</span>
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => {
                  setSelectedOrganization(e.target.value);
                  // Upstream change clears invalid downstream selection
                  setPrimaryService('');
                  setSelectedSubServices([]);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-semibold outline-none focus:border-orange-500"
              >
                {ORGANIZATIONS.map((org) => (
                  <option key={org.key} value={org.key}>
                    {org.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Enquiry Category */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Enquiry Category <span className="text-orange-500">*</span>
              </label>
              <select
                value={enquiryCategory}
                onChange={(e) => {
                  setEnquiryCategory(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-orange-500"
              >
                {ENQUIRY_CATEGORIES.map((ec) => (
                  <option key={ec.value} value={ec.value}>
                    {ec.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Required Service Selection (Filtered dynamically from catalog by organization) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">
                Required Service ({selectedOrganization})
              </label>
              <span className="text-[10px] text-slate-500">
                {availableServices.length} service{availableServices.length === 1 ? '' : 's'} available
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-[#0e161d] border border-[#1c2936] rounded-xl">
              {availableServices.length > 0 ? (
                availableServices.map((service: any) => {
                  const isSelected = primaryService === service.name;
                  return (
                    <div
                      key={service.id || service.code || service.name}
                      onClick={() => {
                        userHasEditedRef.current = true;
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
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold border border-rose-500/30">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-6 text-center text-slate-500 text-xs">
                  {isLoadingCatalog ? 'Loading service catalog...' : 'No specific catalog items registered for this organization.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. STRUCTURED ADDRESS & REAL-TIME PINCODE LOOKUP */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2631] pb-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>3. Structured Address & Pincode Lookup</span>
            </h4>
            {pincodeStatus && (
              <span className={`text-[10px] font-medium flex items-center gap-1 ${
                pincodeStatus.includes('Verified') ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {pincodeStatus.includes('Verified') && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {pincodeStatus}
              </span>
            )}
          </div>

          {isAmbulance ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <div>
                <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">
                  Ambulance Pickup Location <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Patient pickup address / landmark"
                  value={pickupLocation}
                  onChange={(e) => {
                    setPickupLocation(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">
                  Destination Hospital
                </label>
                <input
                  type="text"
                  placeholder="Destination clinic or hospital name"
                  value={destinationLocation}
                  onChange={(e) => {
                    setDestinationLocation(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Street */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Street Address (Door / Flat No., Street, Landmark)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14A, 2nd Main Road, Gandhi Nagar"
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              {/* Postal Code, City, State, Country */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Postal Code with real-time API lookup */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center justify-between">
                    <span>Postal Code</span>
                    {isLookingUpPincode && <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. 600020"
                      value={postalCode}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      onBlur={() => {
                        if (postalCode.trim().length >= 5) {
                          handlePincodeLookup(postalCode, country);
                        }
                      }}
                      className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => handlePincodeLookup(postalCode, country)}
                      className="absolute right-1.5 top-1.5 text-slate-500 hover:text-orange-400"
                      title="Trigger Pincode Lookup"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      userHasEditedRef.current = true;
                    }}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      userHasEditedRef.current = true;
                    }}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. India"
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      userHasEditedRef.current = true;
                    }}
                    className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. PATIENT / CLINICAL REQUIREMENTS */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
            4. Patient / Client Details
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Patient Full Name</label>
              <input
                type="text"
                placeholder="e.g. Meenakshi Ammal"
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Age</label>
              <input
                type="number"
                placeholder="e.g. 74"
                value={patientAge}
                onChange={(e) => {
                  setPatientAge(e.target.value);
                  userHasEditedRef.current = true;
                }}
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
                onChange={(e) => {
                  setPatientConditions(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Mobility Requirements</label>
              <select
                value={patientMobility}
                onChange={(e) => {
                  setPatientMobility(e.target.value);
                  userHasEditedRef.current = true;
                }}
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
                onChange={(e) => {
                  setEngagementType(e.target.value);
                  userHasEditedRef.current = true;
                }}
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
                onChange={(e) => {
                  setCareDurationCategory(e.target.value);
                  userHasEditedRef.current = true;
                }}
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
                onChange={(e) => {
                  setCareSchedule(e.target.value);
                  userHasEditedRef.current = true;
                }}
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

        {/* 5. LIVE CALL NOTES */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              5. Live Call Notes & Interactions
            </h4>
          </div>

          <textarea
            rows={3}
            value={liveNotesText}
            onChange={(e) => {
              setLiveNotesText(e.target.value);
              userHasEditedRef.current = true;
            }}
            placeholder="Record notes while speaking with customer... Automatically persisted in draft and linked with call record."
            className="w-full bg-[#121b24] border border-[#233342] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
          />
        </div>

        {/* 6. DISPOSITION & FOLLOW-UP */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
            6. Interaction Outcome & Follow-Up
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Call Outcome</label>
              <select
                value={callOutcome}
                onChange={(e) => {
                  setCallOutcome(e.target.value);
                  userHasEditedRef.current = true;
                }}
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
                onChange={(e) => {
                  setFollowupDate(e.target.value);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-4 border-t border-[#1e2933] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {draftStatus === 'SAVED' && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> All form changes saved to draft
              </span>
            )}
            {draftStatus === 'UNSAVED' && (
              <span className="text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> Saving draft...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-[#141b22] hover:bg-[#1a232c] text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-900/40 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving & Linking Lead...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Link Lead Record
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* CONFIRM CLOSE MODAL IF UNSAVED CHANGES */}
      {showCloseConfirm && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111822] border border-[#223344] rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Unsaved Intake Documentation</span>
            </div>
            <p className="text-xs text-slate-300">
              You have in-progress edits for this call intake. Draft changes have been saved locally, but not yet linked to the database. Are you sure you want to close?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
              >
                Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Close Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      {innerContent}
    </div>
  );
}
