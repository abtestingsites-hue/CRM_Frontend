'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Phone,
  User,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Save,
  X,
  RefreshCw,
  Search,
  MapPin,
  Building2,
  Layers,
  ShieldAlert,
  Check,
  CheckSquare,
  Square,
  MessageSquare,
  History,
  Scale,
  Users,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

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
  isInlineWorkspace?: boolean;
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
  isInlineWorkspace = false,
}: CallIntakeFormModalProps) {
  // Service catalog state (Dynamically fetched from backend)
  const [catalogOrganizations, setCatalogOrganizations] = useState<Array<{ key: string; name: string; label: string }>>([]);
  const [catalogFoundations, setCatalogFoundations] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Effective identifier for draft caching
  const effectiveSessionId = callSid || leadId || 'default_session';

  // Section references for quick navigation
  const serviceSectionRef = useRef<HTMLDivElement | null>(null);

  // Form Fields - Contact
  const [enquirerName, setEnquirerName] = useState(customerName || '');
  const [primaryCountryCode, setPrimaryCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [secondaryCountryCode, setSecondaryCountryCode] = useState('+91');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');

  // WhatsApp Verification Status
  const [whatsappStatus, setWhatsappStatus] = useState<'VERIFIED' | 'NOT_REGISTERED' | 'PENDING' | 'UNKNOWN'>('UNKNOWN');
  const [whatsappReason, setWhatsappReason] = useState<string | null>(null);
  const [isCheckingWhatsapp, setIsCheckingWhatsapp] = useState(false);
  const whatsappCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Service Hierarchy: Organization -> Enquiry Category -> Subcategory -> Required Service
  const [selectedOrganization, setSelectedOrganization] = useState('UEC');
  const [enquiryCategory, setEnquiryCategory] = useState('SERVICE_ENQUIRY');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');
  const [primaryService, setPrimaryService] = useState('');
  const [selectedSubServices, setSelectedSubServices] = useState<string[]>([]);

  // Patient Fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientWeight, setPatientWeight] = useState('');
  const [patientWeightUnit, setPatientWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [patientConditions, setPatientConditions] = useState('');
  const [patientMobility, setPatientMobility] = useState('Needs Partial Assistance (Walker / Cane)');

  // Dynamic Fields for Job Enquiry / Careers
  const [jobRoleApplied, setJobRoleApplied] = useState('Staff Nurse');
  const [jobExperienceYears, setJobExperienceYears] = useState('1-3 years');
  const [jobHighestQualification, setJobHighestQualification] = useState('B.Sc Nursing / GNM');
  const [jobCurrentEmployer, setJobCurrentEmployer] = useState('');
  const [jobExpectedSalary, setJobExpectedSalary] = useState('');
  const [jobNoticePeriod, setJobNoticePeriod] = useState('Immediate / 15 days');

  // Dynamic Fields for Volunteer / Donor / Other Enquiries
  const [donorCauseInterest, setDonorCauseInterest] = useState('Elderly Medical Care & Bed Fund');
  const [donationFrequency, setDonationFrequency] = useState('ONE_TIME');
  const [volunteerAreas, setVolunteerAreas] = useState('Companion Care & Recreation');

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
  const userEditedCityRef = useRef<boolean>(false);
  const userEditedStateRef = useRef<boolean>(false);

  // Ambulance specific
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');

  // Live Notes & Draft Auto-Save
  const [liveNotesText, setLiveNotesText] = useState('');
  const [draftStatus, setDraftStatus] = useState<'IDLE' | 'UNSAVED' | 'SAVING' | 'SAVED' | 'FAILED'>('IDLE');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Returning Caller Intelligence State
  const [callerLookupData, setCallerLookupData] = useState<any | null>(null);
  const [isLookingUpCaller, setIsLookingUpCaller] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [multipleMatchesList, setMultipleMatchesList] = useState<any[]>([]);

  // Phase 27 — Agent Feedback & Customer Disposition State
  const [interestLevel, setInterestLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_INTERESTED' | 'PENDING'>('PENDING');
  const [customerDisposition, setCustomerDisposition] = useState('CONTACTED');
  const [agentFeedback, setAgentFeedback] = useState('');
  const [nextAction, setNextAction] = useState('CALL_AGAIN');
  const [followupDate, setFollowupDate] = useState('');
  const [followupTime, setFollowupTime] = useState('10:00');
  const [followupType, setFollowupType] = useState('CALLBACK');
  const [followupNotes, setFollowupNotes] = useState('');
  const [callOutcome, setCallOutcome] = useState('COMPLETED');
  const [callbackRequired, setCallbackRequired] = useState(false);
  const [callbackPriority, setCallbackPriority] = useState('NORMAL');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Track initialization to avoid overwriting user edits
  const initializedSessionRef = useRef<string | null>(null);
  const userHasEditedRef = useRef<boolean>(false);

  // Load backend catalog dynamically
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setIsLoadingCatalog(true);
        const res = await apiFetch(`/api/v1/enquiry/catalog`);
        if (res.ok) {
          const data = await res.json();
          if (data.organizations && Array.isArray(data.organizations)) {
            setCatalogOrganizations(data.organizations);
          }
          if (data.foundations && Array.isArray(data.foundations)) {
            setCatalogFoundations(data.foundations);
          }
          if (data.items && Array.isArray(data.items)) {
            setCatalogItems(data.items);
          }
        }
      } catch (e) {
        console.error('Failed to load dynamic catalog in intake form:', e);
      } finally {
        setIsLoadingCatalog(false);
      }
    }
    if (isOpen) fetchCatalog();
  }, [isOpen]);

  // Compute available enquiry categories for the chosen organization from dynamic catalog
  const currentOrganizationFoundations = useMemo(() => {
    return catalogFoundations.find(
      (f) => f.key.toUpperCase() === selectedOrganization.toUpperCase()
    );
  }, [catalogFoundations, selectedOrganization]);

  const availableEnquiryCategories = useMemo(() => {
    if (currentOrganizationFoundations?.enquiryCategories?.length) {
      return currentOrganizationFoundations.enquiryCategories;
    }
    // Fallback standard categories
    return [
      { value: 'SERVICE_ENQUIRY', label: 'Service Enquiry', subcategories: [] },
      { value: 'JOB_ENQUIRY', label: 'Job Enquiry / Careers', subcategories: [] },
      { value: 'VOLUNTEER_ENQUIRY', label: 'Volunteer Enquiry', subcategories: [] },
      { value: 'DONOR_ENQUIRY', label: 'Donor Enquiry', subcategories: [] },
      { value: 'GENERAL_ENQUIRY', label: 'General Enquiry', subcategories: [] },
      { value: 'COMPLAINT_OR_SUPPORT', label: 'Complaint / Support', subcategories: [] },
    ];
  }, [currentOrganizationFoundations]);

  // Compute available subcategories for chosen organization + enquiryCategory
  const currentSubcategories = useMemo(() => {
    const matchedCategory = availableEnquiryCategories.find(
      (c: any) => c.value === enquiryCategory
    );
    return matchedCategory?.subcategories || [];
  }, [availableEnquiryCategories, enquiryCategory]);

  // Filter available services based on Organization, Enquiry Category, and Subcategory
  const availableServices = useMemo(() => {
    if (!catalogItems || catalogItems.length === 0) return [];

    const targetKey = selectedOrganization.toUpperCase();

    return catalogItems.filter((item) => {
      const itemKey = (item.foundationKey || item.foundation || '').toUpperCase();
      const matchesOrg = itemKey === targetKey;
      if (!matchesOrg) return false;

      // Subcategory filter if not ALL
      if (selectedSubcategory && selectedSubcategory !== 'ALL') {
        const itemSubcat = (item.subcategory || (item.intakeFields as any)?.subcategory || '').toLowerCase();
        if (itemSubcat && !itemSubcat.includes(selectedSubcategory.toLowerCase()) && !selectedSubcategory.toLowerCase().includes(itemSubcat)) {
          return false;
        }
      }
      return true;
    });
  }, [selectedOrganization, catalogItems, selectedSubcategory]);

  const isAmbulance = selectedOrganization === 'AMBULANCE' || primaryService.toLowerCase().includes('ambulance');

  // Trigger Returning Caller Lookup
  const performCallerLookup = useCallback(async (rawPhone: string) => {
    if (!rawPhone || rawPhone.trim().length < 7) return;
    setIsLookingUpCaller(true);
    setMultipleMatchesList([]);
    try {
      const res = await apiFetch(`/api/v1/telephony/caller-lookup/${encodeURIComponent(rawPhone.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCallerLookupData(data);

        if (data.matchStatus === 'MATCH_FOUND') {
          // Exactly one eligible match exists: auto-populate customer/intake data if user hasn't typed
          const cust = data.matchingCustomer;
          const lead = data.matchingLead;
          const existing = cust || lead;

          if (existing && !userHasEditedRef.current) {
            if (existing.name && existing.name !== 'Inbound Caller' && existing.name !== 'Customer') {
              setEnquirerName(existing.name);
            } else if (existing.customerName) {
              setEnquirerName(existing.customerName);
            }

            if (existing.email) setEmail(existing.email);
            if (existing.secondaryPhone) {
              const secParsed = splitPhoneAndCountryCode(existing.secondaryPhone);
              setSecondaryCountryCode(secParsed.countryCode);
              setSecondaryPhone(secParsed.number);
            }

            // Structured address
            if (existing.street) setStreet(existing.street);
            if (existing.city) setCity(existing.city);
            if (existing.state) setState(existing.state);
            if (existing.country) setCountry(existing.country || 'India');
            if (existing.postalCode) setPostalCode(existing.postalCode);

            // Patient details
            if (existing.patientName) setPatientName(existing.patientName);
            if (existing.patientAge) setPatientAge(String(existing.patientAge));
            if (existing.patientWeight) setPatientWeight(String(existing.patientWeight));
            if (existing.patientWeightUnit) setPatientWeightUnit(existing.patientWeightUnit as 'kg' | 'lb');
            if (lead?.patientConditions) setPatientConditions(lead.patientConditions);
            if (lead?.patientMobility) setPatientMobility(lead.patientMobility);

            // Organization & service interest
            if (lead?.foundation) setSelectedOrganization(lead.foundation);
            if (lead?.enquiryCategory) setEnquiryCategory(lead.enquiryCategory);
            if (lead?.primaryService || lead?.serviceInterest) {
              setPrimaryService(lead.primaryService || lead.serviceInterest);
            }

            if (existing.whatsappStatus) {
              setWhatsappStatus(existing.whatsappStatus as any);
            }
          }
        } else if (data.matchStatus === 'MULTIPLE_MATCHES') {
          setMultipleMatchesList(data.matches || []);
        }
      }
    } catch (e) {
      console.warn('[Caller Lookup] Failed:', e);
    } finally {
      setIsLookingUpCaller(false);
    }
  }, []);

  // WhatsApp Registration Verification (Authorized provider capability check)
  const verifyWhatsAppRegistration = useCallback(async (fullNumber: string) => {
    const cleanDigits = fullNumber.replace(/[^\d+]/g, '');
    if (!cleanDigits || cleanDigits.length < 8) {
      setWhatsappStatus('UNKNOWN');
      setWhatsappReason('Invalid number length for WhatsApp check');
      return;
    }

    setIsCheckingWhatsapp(true);
    setWhatsappStatus('PENDING');
    setWhatsappReason(null);

    try {
      const res = await apiFetch(`/api/v1/enquiry/whatsapp-status/${encodeURIComponent(cleanDigits)}`);
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data.status || 'UNKNOWN');
        setWhatsappReason(data.reason || null);
      } else {
        setWhatsappStatus('UNKNOWN');
        setWhatsappReason('Provider verification service returned non-200 status');
      }
    } catch (err: any) {
      setWhatsappStatus('UNKNOWN');
      setWhatsappReason('Network error querying WhatsApp status provider');
    } finally {
      setIsCheckingWhatsapp(false);
    }
  }, []);

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
          if (draft.selectedSubcategory) setSelectedSubcategory(draft.selectedSubcategory);
          if (draft.primaryService) setPrimaryService(draft.primaryService);
          if (draft.selectedSubServices) setSelectedSubServices(draft.selectedSubServices);
          if (draft.patientName) setPatientName(draft.patientName);
          if (draft.patientAge) setPatientAge(draft.patientAge);
          if (draft.patientWeight) setPatientWeight(draft.patientWeight);
          if (draft.patientWeightUnit) setPatientWeightUnit(draft.patientWeightUnit);
          if (draft.patientConditions) setPatientConditions(draft.patientConditions);
          if (draft.patientMobility) setPatientMobility(draft.patientMobility);
          if (draft.jobRoleApplied) setJobRoleApplied(draft.jobRoleApplied);
          if (draft.jobExperienceYears) setJobExperienceYears(draft.jobExperienceYears);
          if (draft.jobHighestQualification) setJobHighestQualification(draft.jobHighestQualification);
          if (draft.jobCurrentEmployer) setJobCurrentEmployer(draft.jobCurrentEmployer);
          if (draft.jobExpectedSalary) setJobExpectedSalary(draft.jobExpectedSalary);
          if (draft.jobNoticePeriod) setJobNoticePeriod(draft.jobNoticePeriod);
          if (draft.donorCauseInterest) setDonorCauseInterest(draft.donorCauseInterest);
          if (draft.donationFrequency) setDonationFrequency(draft.donationFrequency);
          if (draft.volunteerAreas) setVolunteerAreas(draft.volunteerAreas);
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
          if (draft.whatsappStatus) setWhatsappStatus(draft.whatsappStatus);
          if (draft.interestLevel) setInterestLevel(draft.interestLevel);
          if (draft.customerDisposition) setCustomerDisposition(draft.customerDisposition);
          if (draft.agentFeedback) setAgentFeedback(draft.agentFeedback);
          if (draft.nextAction) setNextAction(draft.nextAction);
          if (draft.followupTime) setFollowupTime(draft.followupTime);
          if (draft.followupType) setFollowupType(draft.followupType);
          if (draft.followupNotes) setFollowupNotes(draft.followupNotes);
          setDraftStatus('SAVED');
          restoredFromDraft = true;
        }
      }
    } catch (e) {
      console.warn('[Draft] Failed to load local draft:', e);
    }

    // 2. If no local draft, populate from initialData or incoming props
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
        if (initialData.patientWeight) setPatientWeight(String(initialData.patientWeight));
        if (initialData.patientWeightUnit) setPatientWeightUnit(initialData.patientWeightUnit);
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
        if (initialData.whatsappStatus) setWhatsappStatus(initialData.whatsappStatus);
        if (initialData.interestLevel) setInterestLevel(initialData.interestLevel);
        if (initialData.customerDisposition) setCustomerDisposition(initialData.customerDisposition);
        else if (initialData.status) setCustomerDisposition(initialData.status);
        if (initialData.agentFeedback) setAgentFeedback(initialData.agentFeedback);
        else if (initialData.notes) setAgentFeedback(initialData.notes);
        if (initialData.nextAction) setNextAction(initialData.nextAction);
        if (initialData.followupDate) {
          const dt = new Date(initialData.followupDate);
          if (!isNaN(dt.getTime())) {
            setFollowupDate(dt.toISOString().split('T')[0]);
            const hrs = String(dt.getHours()).padStart(2, '0');
            const mins = String(dt.getMinutes()).padStart(2, '0');
            setFollowupTime(initialData.followupTime || `${hrs}:${mins}`);
          }
        }
        if (initialData.followupType) setFollowupType(initialData.followupType);
        if (initialData.followupNotes) setFollowupNotes(initialData.followupNotes);
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

    // 3. Trigger caller intelligence lookup on actual phone
    const targetPhoneForLookup = phoneNumber || (initialData?.phoneNumber) || '';
    if (targetPhoneForLookup) {
      performCallerLookup(targetPhoneForLookup);
    }
  }, [isOpen, effectiveSessionId, phoneNumber, customerName, initialData, performCallerLookup]);

  // Debounced auto-check WhatsApp status on primary phone input
  useEffect(() => {
    if (!phone || phone.trim().length < 8) return;
    if (whatsappCheckTimeoutRef.current) clearTimeout(whatsappCheckTimeoutRef.current);

    whatsappCheckTimeoutRef.current = setTimeout(() => {
      const fullNum = `${primaryCountryCode}${phone.replace(/[^\d]/g, '')}`;
      verifyWhatsAppRegistration(fullNum);
    }, 1200);

    return () => {
      if (whatsappCheckTimeoutRef.current) clearTimeout(whatsappCheckTimeoutRef.current);
    };
  }, [phone, primaryCountryCode, verifyWhatsAppRegistration]);

  // Pincode lookup helper
  const handlePincodeLookup = useCallback(async (code: string, currentCountry: string) => {
    const clean = code.trim();
    if (!clean || clean.length < 4) return;
    setIsLookingUpPincode(true);
    setPincodeStatus(null);
    try {
      const res = await apiFetch(`/api/v1/enquiry/postal-lookup/${encodeURIComponent(clean)}?country=${encodeURIComponent(currentCountry)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && (data.city || data.state)) {
          // Do not overwrite if user has explicitly edited city/state manually
          if (data.city && !userEditedCityRef.current) setCity(data.city);
          if (data.state && !userEditedStateRef.current) setState(data.state);
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

  // Trigger pincode lookup when 6 digits entered for India, or blur for other countries
  const handlePostalCodeChange = (val: string) => {
    setPostalCode(val);
    userHasEditedRef.current = true;
    setDraftStatus('UNSAVED');
    if (val.trim().length === 6 && country.toLowerCase() === 'india') {
      handlePincodeLookup(val, country);
    }
  };

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
        selectedSubcategory,
        primaryService,
        selectedSubServices,
        patientName,
        patientAge,
        patientWeight,
        patientWeightUnit,
        patientConditions,
        patientMobility,
        jobRoleApplied,
        jobExperienceYears,
        jobHighestQualification,
        jobCurrentEmployer,
        jobExpectedSalary,
        jobNoticePeriod,
        donorCauseInterest,
        donationFrequency,
        volunteerAreas,
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
        whatsappStatus,
        interestLevel,
        customerDisposition,
        agentFeedback,
        nextAction,
        followupTime,
        followupType,
        followupNotes,
      };

      // 1. Save locally
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
    selectedOrganization, enquiryCategory, selectedSubcategory, primaryService, selectedSubServices,
    patientName, patientAge, patientWeight, patientWeightUnit, patientConditions, patientMobility,
    jobRoleApplied, jobExperienceYears, jobHighestQualification, jobCurrentEmployer, jobExpectedSalary, jobNoticePeriod,
    donorCauseInterest, donationFrequency, volunteerAreas,
    engagementType, careDurationCategory, careDuration, careSchedule,
    street, city, state, country, postalCode, pickupLocation, destinationLocation,
    liveNotesText, callOutcome, followupDate, effectiveSessionId, callSid, whatsappStatus,
    interestLevel, customerDisposition, agentFeedback, nextAction, followupTime, followupType, followupNotes
  ]);

  if (!isOpen) return null;

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validate patient weight if entered
    let numWeight: number | undefined = undefined;
    if (patientWeight.trim()) {
      const parsed = parseFloat(patientWeight);
      if (isNaN(parsed) || parsed <= 0 || parsed > 700) {
        setErrorMessage('Please enter a valid numeric patient weight (e.g. 10 to 300 kg / 20 to 660 lb).');
        setIsSubmitting(false);
        return;
      }
      numWeight = parsed;
    }

    // Validate follow-up date and time if required by disposition or next action
    const requiresFollowup = customerDisposition === 'FOLLOWUP_REQUIRED' || nextAction === 'CALL_AGAIN' || nextAction === 'SCHEDULE_APPOINTMENT';
    if (requiresFollowup) {
      if (!followupDate || !followupTime) {
        setErrorMessage('Follow-up Date and Time are mandatory when Follow-up Required or Appointment is selected.');
        setIsSubmitting(false);
        return;
      }
    }

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
      patientWeight: numWeight,
      patientWeightUnit,
      patientConditions: patientConditions || undefined,
      patientMobility,
      jobRoleApplied: enquiryCategory === 'JOB_ENQUIRY' ? jobRoleApplied : undefined,
      jobExperienceYears: enquiryCategory === 'JOB_ENQUIRY' ? jobExperienceYears : undefined,
      jobHighestQualification: enquiryCategory === 'JOB_ENQUIRY' ? jobHighestQualification : undefined,
      jobCurrentEmployer: enquiryCategory === 'JOB_ENQUIRY' ? jobCurrentEmployer : undefined,
      jobExpectedSalary: enquiryCategory === 'JOB_ENQUIRY' ? jobExpectedSalary : undefined,
      jobNoticePeriod: enquiryCategory === 'JOB_ENQUIRY' ? jobNoticePeriod : undefined,
      donorCauseInterest: enquiryCategory === 'DONOR_ENQUIRY' ? donorCauseInterest : undefined,
      donationFrequency: enquiryCategory === 'DONOR_ENQUIRY' ? donationFrequency : undefined,
      volunteerAreas: enquiryCategory === 'VOLUNTEER_ENQUIRY' ? volunteerAreas : undefined,
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
      // Phase 27 Agent Feedback & Customer Disposition Payload
      interestLevel,
      customerDisposition,
      agentFeedback: agentFeedback || liveNotesText || undefined,
      nextAction,
      followupDate: followupDate ? (followupTime ? `${followupDate}T${followupTime}:00` : new Date(followupDate).toISOString()) : undefined,
      followupTime: followupTime || undefined,
      followupType,
      followupNotes: followupNotes || undefined,
      callbackRequired,
      callbackPriority,
      whatsappStatus,
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

  const scrollToServices = () => {
    if (serviceSectionRef.current) {
      serviceSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isContainerEmbedded = Boolean(embedded || isInlineWorkspace);

  const innerContent = (
    <div className={`bg-[#0b1015] border border-[#1e2933] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-200 text-xs ${
      isContainerEmbedded ? 'w-full h-full' : 'w-full max-w-4xl max-h-[92vh] animate-in fade-in zoom-in-95 duration-200'
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

      {/* TOP SERVICES CHOOSING QUICK ACCESS BAR (Requirement B.6) */}
      <div className="bg-[#121b24] border-b border-[#1b2631] px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Scope:</span>
          <span className="px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold text-[11px]">
            {selectedOrganization}
          </span>
          <span className="text-slate-500">•</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
            {availableEnquiryCategories.find((c: any) => c.value === enquiryCategory)?.label || enquiryCategory}
          </span>
          {primaryService && (
            <>
              <span className="text-slate-500">→</span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[11px]">
                {primaryService}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={scrollToServices}
          className="px-3 py-1 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 font-bold text-[11px] flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Services Choosing</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* FORM BODY */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* RETURNING CALLER INTELLIGENCE CARD (Requirement E) */}
        {callerLookupData?.matchStatus === 'MATCH_FOUND' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900 border border-blue-500/30 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <span>Returning Customer Identified: {callerLookupData.name || enquirerName || 'Registered Contact'}</span>
                    <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      Verified Match
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Unit: {callerLookupData.businessUnit} • Previous Interactions: {callerLookupData.previousCallsCount || 1} • Last Contact: {callerLookupData.lastContactDate ? new Date(callerLookupData.lastContactDate).toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>

              {callerLookupData.relevantCalls?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{showHistoryDrawer ? 'Hide Previous Calls' : `View ${callerLookupData.relevantCalls.length} Previous Calls`}</span>
                  {showHistoryDrawer ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Previous Call Interactions Accordion */}
            {showHistoryDrawer && callerLookupData.relevantCalls?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-blue-500/20 animate-in fade-in duration-200">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Historical Call Interactions & Notes
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {callerLookupData.relevantCalls.map((call: any, idx: number) => (
                    <div key={call.id || idx} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-semibold text-slate-300">
                          {call.direction} CALL • {call.startedAt ? new Date(call.startedAt).toLocaleString() : 'Past Date'}
                        </span>
                        <span>Duration: {call.duration}s • Agent: {call.agentName || 'Raghav'}</span>
                      </div>
                      {(call.notes || call.summary) && (
                        <p className="text-slate-300 bg-[#0d141b] p-2 rounded-lg border border-[#1d2732] text-[11px] font-sans">
                          {call.notes || call.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MULTIPLE MATCHES DETECTED BANNER (Requirement E.8) */}
        {callerLookupData?.matchStatus === 'MULTIPLE_MATCHES' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Multiple Customer Records Found — Agent Verification Required</span>
            </div>
            <p className="text-[11px] text-slate-300">
              This caller number matches {multipleMatchesList.length} distinct records across units. To prevent accidental merging, verify the active record:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {multipleMatchesList.map((m: any, i: number) => (
                <div key={m.id || i} className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]">
                  <div>
                    <strong className="text-white">{m.name}</strong>
                    <div className="text-[10px] text-slate-400">Unit: {m.unit?.name || m.unit?.code} • Status: {m.status}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (m.name) setEnquirerName(m.name);
                      if (m.unit?.code) setSelectedOrganization(m.unit.code);
                    }}
                    className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold"
                  >
                    Select Record
                  </button>
                </div>
              ))}
            </div>
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

        {/* 1. CONTACT & PHONE DETAILS WITH INDEPENDENT COUNTRY CODES & WHATSAPP (Section A) */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1 flex items-center justify-between">
            <span>1. Contact & Phone Intelligence</span>
            <span className="text-[10px] text-slate-500 normal-case font-normal">Primary number auto-synced from active call session</span>
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

            {/* Primary Phone with Country Code Selector & WhatsApp Verification Badge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Primary Phone <span className="text-orange-500">*</span>
                </label>
                {/* WhatsApp Status Indicator (Requirement A.6-8) */}
                <div className="text-[10px] font-medium flex items-center gap-1">
                  {isCheckingWhatsapp ? (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Checking WhatsApp...
                    </span>
                  ) : whatsappStatus === 'VERIFIED' ? (
                    <span className="text-emerald-400 flex items-center gap-0.5" title="WhatsApp Registration Verified via Meta Cloud API">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> WhatsApp Verified
                    </span>
                  ) : whatsappStatus === 'NOT_REGISTERED' ? (
                    <span className="text-rose-400 flex items-center gap-0.5" title="Number is not registered on WhatsApp">
                      <X className="w-3 h-3 text-rose-400" /> Not Registered
                    </span>
                  ) : whatsappStatus === 'PENDING' ? (
                    <span className="text-amber-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> Pending
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-0.5" title={whatsappReason || 'Provider capability unconfigured or offline'}>
                      <HelpCircle className="w-3 h-3 text-slate-500" /> WhatsApp: Unknown
                    </span>
                  )}
                </div>
              </div>

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
                    let val = e.target.value;
                    // Auto-detect country code if pasted with +
                    if (val.startsWith('+')) {
                      for (const c of COUNTRY_CODES) {
                        if (val.startsWith(c.code)) {
                          setPrimaryCountryCode(c.code);
                          val = val.substring(c.code.length);
                          break;
                        }
                      }
                    }
                    setPhone(val);
                    userHasEditedRef.current = true;
                  }}
                  className="flex-1 min-w-0 bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Secondary Phone (Optional) with Independent Country Code Selector */}
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
                    let val = e.target.value;
                    if (val.startsWith('+')) {
                      for (const c of COUNTRY_CODES) {
                        if (val.startsWith(c.code)) {
                          setSecondaryCountryCode(c.code);
                          val = val.substring(c.code.length);
                          break;
                        }
                      }
                    }
                    setSecondaryPhone(val);
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

        {/* 2. SERVICE HIERARCHY: ORGANIZATION -> ENQUIRY CATEGORY -> SUBCATEGORY -> REQUIRED SERVICE (Section B) */}
        <div ref={serviceSectionRef} className="space-y-3 pt-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1 flex items-center justify-between">
            <span>2. Organization & Service Catalogue Hierarchy</span>
            <span className="text-[10px] text-slate-500 normal-case font-normal">Dynamic backend catalogue loading</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Organization Dropdown (Strictly Organizations: UEC, UNCF, ACare - Requirement B.1) */}
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Organization Unit <span className="text-orange-500">*</span>
              </label>
              <select
                value={selectedOrganization}
                onChange={(e) => {
                  const org = e.target.value;
                  setSelectedOrganization(org);
                  setSelectedSubcategory('ALL');
                  setPrimaryService('');
                  setSelectedSubServices([]);
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-semibold outline-none focus:border-orange-500"
              >
                {catalogOrganizations.length > 0 ? (
                  catalogOrganizations.map((org) => (
                    <option key={org.key} value={org.key}>
                      {org.label || org.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="UEC">UEC</option>
                    <option value="UNCF">UNCF</option>
                    <option value="ACARE">ACare</option>
                  </>
                )}
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
                  setSelectedSubcategory('ALL');
                  userHasEditedRef.current = true;
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white font-medium outline-none focus:border-orange-500"
              >
                {availableEnquiryCategories.map((ec: any) => (
                  <option key={ec.value} value={ec.value}>
                    {ec.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subcategories Inside Service Category Section (Requirement B.4) */}
          {currentSubcategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">
                Subcategory Filter ({selectedOrganization})
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    selectedSubcategory === 'ALL'
                      ? 'bg-orange-600 text-white font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Subcategories
                </button>
                {currentSubcategories.map((subcat: string) => (
                  <button
                    key={subcat}
                    type="button"
                    onClick={() => setSelectedSubcategory(subcat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      selectedSubcategory === subcat
                        ? 'bg-orange-600 text-white font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {subcat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Required Service Selection (Filtered dynamically from catalog - Requirement B.5, B.7, B.8) */}
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
                        <div>
                          <span className="font-semibold text-xs block">{service.name}</span>
                          {service.subcategory && (
                            <span className="text-[10px] text-slate-500 font-normal">{service.subcategory}</span>
                          )}
                        </div>
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
                  {isLoadingCatalog ? 'Loading dynamic catalogue...' : 'No services found for current subcategory filter.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC DETAILS: ADAPTS TO ENQUIRY CATEGORY (SERVICE / JOB / DONOR / VOLUNTEER) */}
        {enquiryCategory === 'JOB_ENQUIRY' ? (
          <div className="space-y-3 p-3.5 bg-sky-950/20 border border-sky-500/30 rounded-xl">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-400 border-b border-sky-500/20 pb-1 flex items-center justify-between">
              <span>3. Applicant & Employment Profile (Careers)</span>
              <span className="text-[10px] text-sky-300 normal-case font-normal">Candidate Application Intake</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Designation / Role Applied For <span className="text-orange-500">*</span>
                </label>
                <select
                  value={jobRoleApplied}
                  onChange={(e) => {
                    setJobRoleApplied(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Staff Nurse (B.Sc / GNM)">Staff Nurse (B.Sc / GNM)</option>
                  <option value="General Duty Assistant (GDA)">General Duty Assistant (GDA)</option>
                  <option value="Home Care Nurse / Attendant">Home Care Nurse / Attendant</option>
                  <option value="Physiotherapist">Physiotherapist</option>
                  <option value="Occupational Therapist">Occupational Therapist</option>
                  <option value="Telecaller / Customer Support Executive">Telecaller / Customer Support Executive</option>
                  <option value="Operations / Admin Executive">Operations / Admin Executive</option>
                  <option value="Ambulance Driver / EMT">Ambulance Driver / EMT</option>
                  <option value="Other Healthcare Professional">Other Healthcare Professional</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Total Relevant Experience
                </label>
                <select
                  value={jobExperienceYears}
                  onChange={(e) => {
                    setJobExperienceYears(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Fresher / Less than 1 year">Fresher / Less than 1 year</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="5-8 years">5-8 years</option>
                  <option value="8+ years">8+ years</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Highest Qualification
                </label>
                <select
                  value={jobHighestQualification}
                  onChange={(e) => {
                    setJobHighestQualification(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ANM / GNM Nursing">ANM / GNM Nursing</option>
                  <option value="B.Sc / Post Basic B.Sc Nursing">B.Sc / Post Basic B.Sc Nursing</option>
                  <option value="M.Sc Nursing">M.Sc Nursing</option>
                  <option value="BPT / MPT (Physiotherapy)">BPT / MPT (Physiotherapy)</option>
                  <option value="Diploma in Emergency Medical Care">Diploma in Emergency Medical Care</option>
                  <option value="Graduation / Degree (Any Stream)">Graduation / Degree (Any Stream)</option>
                  <option value="10th / 12th Standard">10th / 12th Standard</option>
                  <option value="Other Certificate Course">Other Certificate Course</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Current / Previous Employer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Hospitals / Private Clinic"
                  value={jobCurrentEmployer}
                  onChange={(e) => {
                    setJobCurrentEmployer(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Expected Monthly Salary
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25,000 - 30,000 / month"
                  value={jobExpectedSalary}
                  onChange={(e) => {
                    setJobExpectedSalary(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Notice Period / Availability
                </label>
                <select
                  value={jobNoticePeriod}
                  onChange={(e) => {
                    setJobNoticePeriod(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Immediate / 15 days">Immediate / 15 days</option>
                  <option value="1 Month">1 Month</option>
                  <option value="2 Months">2 Months</option>
                  <option value="Currently Unemployed / Immediate Joiner">Currently Unemployed / Immediate Joiner</option>
                </select>
              </div>
            </div>
          </div>
        ) : enquiryCategory === 'DONOR_ENQUIRY' ? (
          <div className="space-y-3 p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 border-b border-emerald-500/20 pb-1 flex items-center justify-between">
              <span>3. Donor & Contribution Intent</span>
              <span className="text-[10px] text-emerald-300 normal-case font-normal">Philanthropy & Foundation Support</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Cause / Fund of Interest
                </label>
                <select
                  value={donorCauseInterest}
                  onChange={(e) => {
                    setDonorCauseInterest(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Elderly Medical Care & Bed Fund">Elderly Medical Care & Bed Fund</option>
                  <option value="Palliative Care & Medicine Sponsorship">Palliative Care & Medicine Sponsorship</option>
                  <option value="Dementia Care Day Centre Support">Dementia Care Day Centre Support</option>
                  <option value="Free Ambulance & Emergency Transport Fund">Free Ambulance & Emergency Transport Fund</option>
                  <option value="General Foundation Endowment">General Foundation Endowment</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Donation Frequency
                </label>
                <select
                  value={donationFrequency}
                  onChange={(e) => {
                    setDonationFrequency(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ONE_TIME">One-time Contribution</option>
                  <option value="MONTHLY_RECURRING">Monthly Recurring Support</option>
                  <option value="ANNUAL_CORPUS">Annual Corpus / Memorial Giving</option>
                  <option value="CSR_CORPORATE">Corporate CSR Partnership</option>
                </select>
              </div>
            </div>
          </div>
        ) : enquiryCategory === 'VOLUNTEER_ENQUIRY' ? (
          <div className="space-y-3 p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-xl">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-400 border-b border-purple-500/20 pb-1 flex items-center justify-between">
              <span>3. Volunteer Opportunities & Availability</span>
              <span className="text-[10px] text-purple-300 normal-case font-normal">Community Participation</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Areas of Volunteer Interest
                </label>
                <select
                  value={volunteerAreas}
                  onChange={(e) => {
                    setVolunteerAreas(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Companion Care & Recreation">Elderly Companion Care & Recreational Activities</option>
                  <option value="Reading & Storytelling Sessions">Reading & Storytelling Sessions</option>
                  <option value="Event Coordination & Outings">Event Coordination & Outings</option>
                  <option value="Digital Literacy for Seniors">Digital Literacy & Smartphone Assistance</option>
                  <option value="Admin & Campus Assistance">Admin, Garden & Campus Assistance</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-300 block mb-1">
                  Available Time Commitment
                </label>
                <select
                  value={engagementType}
                  onChange={(e) => {
                    setEngagementType(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="Weekends (2-4 hours)">Weekends (2-4 hours)</option>
                  <option value="Weekday Mornings">Weekday Mornings</option>
                  <option value="Weekly 1 Full Day">Weekly 1 Full Day</option>
                  <option value="Flexible / As Needed for Events">Flexible / As Needed for Events</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Default: SERVICE_ENQUIRY (Elderly & Healthcare Patient Profile) */
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2631] pb-1">
              3. Patient / Client Details & Clinical Weight
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

              {/* Patient Weight with kg / lb unit selector (Requirement C.1-5) */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1 flex items-center justify-between">
                  <span>Weight</span>
                  <span className="text-[9px] text-slate-500">Unit: {patientWeightUnit}</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="700"
                    placeholder="e.g. 68.5"
                    value={patientWeight}
                    onChange={(e) => {
                      setPatientWeight(e.target.value);
                      userHasEditedRef.current = true;
                    }}
                    className="flex-1 min-w-0 bg-[#121b24] border border-[#233342] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-orange-500"
                  />
                  <select
                    value={patientWeightUnit}
                    onChange={(e) => {
                      setPatientWeightUnit(e.target.value as 'kg' | 'lb');
                      userHasEditedRef.current = true;
                    }}
                    className="w-16 bg-[#121b24] border border-[#233342] rounded-lg px-1.5 py-1.5 text-xs text-slate-200 font-bold outline-none focus:border-orange-500 shrink-0"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </div>
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
        )}

        {/* 4. STRUCTURED ADDRESS & REAL-TIME PINCODE LOOKUP (Section D) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#1b2631] pb-1">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>4. Structured Address & Location Intelligence</span>
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
                        if (postalCode.trim().length >= 4) {
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
                      userEditedCityRef.current = true;
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
                      userEditedStateRef.current = true;
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

        {/* 5. CURRENT CALL NOTES (Section F: Per-Call Notes & Preservation) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span>5. Current Interaction Live Notes</span>
            </h4>
            <span className="text-[10px] text-slate-500">
              Saved strictly to this call session ({callSid ? callSid.slice(0, 16) : 'Current'})
            </span>
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

        {/* 6. AGENT FEEDBACK & CUSTOMER DISPOSITION (PHASE 27) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[#1b2631] pb-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <span>6. Agent Feedback & Customer Disposition</span>
            </h4>
            <span className="text-[10px] text-slate-400">Phase 27 Intelligence & Calendar Sync</span>
          </div>

          {/* 1. Customer Interest Level */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
              Customer Interest Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { value: 'HIGH', label: 'High', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' },
                { value: 'MEDIUM', label: 'Medium', color: 'border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
                { value: 'LOW', label: 'Low', color: 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' },
                { value: 'NOT_INTERESTED', label: 'Not Interested', color: 'border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' },
                { value: 'PENDING', label: 'Pending / Undecided', color: 'border-slate-500/50 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20' },
              ].map((lvl) => {
                const isSelected = interestLevel === lvl.value;
                return (
                  <button
                    key={lvl.value}
                    type="button"
                    onClick={() => {
                      setInterestLevel(lvl.value as any);
                      userHasEditedRef.current = true;
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? `${lvl.color} ring-2 ring-orange-500 font-extrabold shadow-md scale-100`
                        : 'border-[#223344] bg-[#101720] text-slate-400 hover:border-[#334455]'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Interaction Status & Next Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Customer Interaction Status <span className="text-orange-400">*</span>
              </label>
              <select
                value={customerDisposition}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerDisposition(val);
                  setCallOutcome(val);
                  userHasEditedRef.current = true;
                  if (val === 'FOLLOWUP_REQUIRED' && !followupDate) {
                    const tmrw = new Date();
                    tmrw.setDate(tmrw.getDate() + 1);
                    setFollowupDate(tmrw.toISOString().split('T')[0]);
                  }
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              >
                <option value="NEW">New (Initial Enquiry)</option>
                <option value="CONTACTED">Contacted (In Discussion)</option>
                <option value="INTERESTED">Interested (High Propensity)</option>
                <option value="FOLLOWUP_REQUIRED">Follow-up Required (Callback / Action)</option>
                <option value="APPOINTMENT_SCHEDULED">Appointment Scheduled (Calendar Booked)</option>
                <option value="PROPOSAL_SHARED">Proposal Shared (Quotation Sent)</option>
                <option value="CONVERTED">Converted (Active Customer / Order Placed)</option>
                <option value="NOT_INTERESTED">Not Interested (Declined Service)</option>
                <option value="UNREACHABLE">Unreachable (No Answer / Voicemail)</option>
                <option value="CLOSED_LOST">Closed / Lost (Disqualified)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Next Action Required
              </label>
              <select
                value={nextAction}
                onChange={(e) => {
                  setNextAction(e.target.value);
                  userHasEditedRef.current = true;
                  if ((e.target.value === 'CALL_AGAIN' || e.target.value === 'SCHEDULE_APPOINTMENT') && !followupDate) {
                    const tmrw = new Date();
                    tmrw.setDate(tmrw.getDate() + 1);
                    setFollowupDate(tmrw.toISOString().split('T')[0]);
                  }
                }}
                className="w-full bg-[#121b24] border border-[#233342] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
              >
                <option value="CALL_AGAIN">Call Again (Follow-up Call)</option>
                <option value="WHATSAPP_FOLLOWUP">Send WhatsApp Follow-up</option>
                <option value="SEND_INFO">Send Information / Brochure / Service Kit</option>
                <option value="SCHEDULE_APPOINTMENT">Schedule In-Person / Virtual Appointment</option>
                <option value="SHARE_QUOTATION">Share Quotation / Cost Estimate</option>
                <option value="ARRANGE_CONSULTATION">Arrange Specialist / Clinical Consultation</option>
                <option value="NO_FURTHER_ACTION">No Further Action Needed</option>
              </select>
            </div>
          </div>

          {/* 3. Agent Feedback / Interaction Notes Textarea */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Agent Feedback & Qualitative Observations
            </label>
            <textarea
              rows={2}
              value={agentFeedback}
              onChange={(e) => {
                setAgentFeedback(e.target.value);
                userHasEditedRef.current = true;
              }}
              placeholder="Record customer preferences, family decisions, specific clinical concerns, objections, and next milestone..."
              className="w-full bg-[#121b24] border border-[#233342] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
            />
          </div>

          {/* 4. Follow-up Scheduling Sub-section (Mandatory when FOLLOWUP_REQUIRED or CALL_AGAIN / APPOINTMENT) */}
          <div className={`p-4 rounded-xl border transition-all ${
            (customerDisposition === 'FOLLOWUP_REQUIRED' || nextAction === 'CALL_AGAIN' || nextAction === 'SCHEDULE_APPOINTMENT')
              ? 'bg-amber-950/20 border-amber-500/40 shadow-md'
              : 'bg-[#101720] border-[#223344]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Automatic Calendar Follow-up Scheduling
                </span>
              </div>
              {(customerDisposition === 'FOLLOWUP_REQUIRED' || nextAction === 'CALL_AGAIN' || nextAction === 'SCHEDULE_APPOINTMENT') ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Mandatory for this disposition
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Optional</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Follow-up Date {(customerDisposition === 'FOLLOWUP_REQUIRED' || nextAction === 'CALL_AGAIN' || nextAction === 'SCHEDULE_APPOINTMENT') && <span className="text-orange-400">*</span>}
                </label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={(e) => {
                    setFollowupDate(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Follow-up Time {(customerDisposition === 'FOLLOWUP_REQUIRED' || nextAction === 'CALL_AGAIN' || nextAction === 'SCHEDULE_APPOINTMENT') && <span className="text-orange-400">*</span>}
                </label>
                <input
                  type="time"
                  value={followupTime}
                  onChange={(e) => {
                    setFollowupTime(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Follow-up Channel / Type
                </label>
                <select
                  value={followupType}
                  onChange={(e) => {
                    setFollowupType(e.target.value);
                    userHasEditedRef.current = true;
                  }}
                  className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                >
                  <option value="CALLBACK">Phone Call (Callback)</option>
                  <option value="WHATSAPP">WhatsApp Message</option>
                  <option value="APPOINTMENT">In-Person Visit / Assessment</option>
                  <option value="CONSULTATION">Video Consultation</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Follow-up Notes / Agenda (Visible in CRM Calendar)
              </label>
              <input
                type="text"
                value={followupNotes}
                onChange={(e) => {
                  setFollowupNotes(e.target.value);
                  userHasEditedRef.current = true;
                }}
                placeholder="e.g. Confirm 12hr care package pricing with patient's family, finalize onboarding"
                className="w-full bg-[#121b24] border border-[#233342] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
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
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-900/40 transition-all disabled:opacity-50"
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

  if (isContainerEmbedded) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      {innerContent}
    </div>
  );
}
