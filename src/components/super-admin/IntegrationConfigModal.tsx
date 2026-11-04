"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Check, AlertCircle, Copy, Eye, EyeOff, ShieldCheck, 
  Zap, ExternalLink, HelpCircle, Key, Server, Globe, Sliders
} from 'lucide-react';

export interface IntegrationItem {
  id: string;
  provider: string;
  unitId?: string | null;
  enabled: boolean;
  settings: Record<string, any>;
  status: string;
  secretMasked?: string;
  version: number;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastTestError?: string | null;
  updatedAt?: string;
}

interface IntegrationConfigModalProps {
  integration: IntegrationItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: string, data: { enabled: boolean; settings: Record<string, any>; secret?: string; unitId?: string }) => Promise<void>;
  onTest: (provider: string) => Promise<any>;
}

interface FieldDef {
  key: string;
  envKey: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'url';
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | number;
  isSecret?: boolean;
}

interface SectionDef {
  title: string;
  icon: any;
  fields: FieldDef[];
}

const PROVIDER_CONFIG_SCHEMAS: Record<string, { name: string; description: string; sections: SectionDef[] }> = {
  INSTAGRAM: {
    name: "Meta / Instagram Messaging",
    description: "Connect Instagram Direct and Messenger via Meta Graph API (Facebook Login Flow).",
    sections: [
      {
        title: "Meta Application Credentials",
        icon: Key,
        fields: [
          { key: "appId", envKey: "META_APP_ID", label: "Meta App ID", type: "text", placeholder: "1704439807564610", help: "Found in your Meta App Dashboard under App Settings > Basic" },
          { key: "appSecret", envKey: "META_APP_SECRET", label: "Meta App Secret", type: "password", isSecret: true, placeholder: "Leave blank to keep current secret", help: "Used for HMAC-SHA256 inbound webhook signature verification" },
        ]
      },
      {
        title: "Page & Instagram Professional Account",
        icon: Globe,
        fields: [
          { key: "pageId", envKey: "META_PAGE_ID", label: "Facebook Page ID", type: "text", placeholder: "106439255625400", help: "The Facebook Page linked to your Instagram Professional Account" },
          { key: "accessToken", envKey: "META_PAGE_ACCESS_TOKEN", label: "Page Access Token", type: "password", isSecret: true, placeholder: "EAAY...", help: "Long-lived Page Access Token with pages_messaging & instagram_manage_messages permissions" },
          { key: "instagramAccountId", envKey: "INSTAGRAM_ACCOUNT_ID", label: "Instagram Account ID", type: "text", placeholder: "17841475463597259", help: "Instagram Professional / Business Account ID" },
        ]
      },
      {
        title: "Webhooks & API Endpoint",
        icon: Server,
        fields: [
          { key: "verifyToken", envKey: "META_VERIFY_TOKEN", label: "Webhook Verify Token", type: "text", placeholder: "my_instagram_verify_token", help: "Secret token matching your Meta Webhook verification configuration" },
          { key: "callbackUrl", envKey: "META_WEBHOOK_CALLBACK_URL", label: "Webhook Callback URL", type: "url", defaultValue: "https://crm-uec-backend.onrender.com/webhook", help: "Enter this URL in Meta App Dashboard > Webhooks > Edit Subscription" },
          { 
            key: "graphVersion", 
            envKey: "META_GRAPH_API_VERSION", 
            label: "Meta Graph API Version", 
            type: "select", 
            defaultValue: "v25.0",
            options: [
              { label: "v25.0 (Recommended / Latest)", value: "v25.0" },
              { label: "v22.0 (Stable)", value: "v22.0" },
              { label: "v21.0 (Legacy)", value: "v21.0" }
            ],
            help: "Target version for Meta Graph API calls" 
          },
        ]
      }
    ]
  },
  WHATSAPP: {
    name: "WhatsApp Business API",
    description: "Official Meta WhatsApp Cloud API for conversational messaging with clients.",
    sections: [
      {
        title: "WhatsApp Cloud Credentials",
        icon: Key,
        fields: [
          { key: "phoneId", envKey: "WHATSAPP_PHONE_ID", label: "WhatsApp Phone Number ID", type: "text", placeholder: "948555518338591", help: "Phone Number ID from Meta WhatsApp Developer Console" },
          { key: "token", envKey: "WHATSAPP_TOKEN", label: "Permanent Access Token", type: "password", isSecret: true, placeholder: "EAAT...", help: "System user access token with whatsapp_business_messaging scope" },
          { key: "verifyToken", envKey: "META_VERIFY_TOKEN", label: "Webhook Verify Token", type: "text", placeholder: "my_instagram_verify_token", help: "Token for Meta WhatsApp Webhook verification" },
          { key: "callbackUrl", envKey: "META_WEBHOOK_CALLBACK_URL", label: "Webhook Callback URL", type: "url", defaultValue: "https://crm-uec-backend.onrender.com/webhook", help: "Public webhook URL for inbound messages" },
        ]
      }
    ]
  },
  EMAIL: {
    name: "Email Services (SMTP / IMAP)",
    description: "Inbound ticket polling and outbound transactional customer emails.",
    sections: [
      {
        title: "Mailbox Authentication",
        icon: Key,
        fields: [
          { key: "user", envKey: "EMAIL_USER", label: "Email Address / User", type: "text", placeholder: "testingforcompany.0@gmail.com", help: "Primary mailbox address for outbound and polling" },
          { key: "pass", envKey: "EMAIL_PASS", label: "App Password", type: "password", isSecret: true, placeholder: "xxxx xxxx xxxx xxxx", help: "16-character Google App Password (2FA enabled)" },
        ]
      },
      {
        title: "Mail Servers Configuration",
        icon: Server,
        fields: [
          { key: "imapHost", envKey: "EMAIL_IMAP_HOST", label: "IMAP Host", type: "text", defaultValue: "imap.gmail.com" },
          { key: "imapPort", envKey: "EMAIL_IMAP_PORT", label: "IMAP Port", type: "number", defaultValue: 993 },
          { key: "smtpHost", envKey: "EMAIL_SMTP_HOST", label: "SMTP Host", type: "text", defaultValue: "smtp.gmail.com" },
          { key: "smtpPort", envKey: "EMAIL_SMTP_PORT", label: "SMTP Port", type: "number", defaultValue: 465 },
        ]
      }
    ]
  },
  VOBIZ: {
    name: "Vobiz Cloud Telephony",
    description: "Primary carrier for agent phone calls, SIP trunking, and call forwarding.",
    sections: [
      {
        title: "Vobiz API Credentials",
        icon: Key,
        fields: [
          { key: "authId", envKey: "VOBIZ_AUTH_ID", label: "Auth ID", type: "text", placeholder: "MA_VMODSCTW", help: "Vobiz API Master Account ID" },
          { key: "authToken", envKey: "VOBIZ_AUTH_TOKEN", label: "Auth Token", type: "password", isSecret: true, placeholder: "Leave blank to preserve", help: "Vobiz secret authorization token" },
          { key: "sipDomain", envKey: "VOBIZ_SIP_DOMAIN", label: "SIP Domain", type: "text", placeholder: "e4bac750.sip.vobiz.ai", help: "SIP trunk gateway domain" },
          { key: "phoneNumber", envKey: "VOBIZ_PHONE_NUMBER", label: "Caller Phone Number", type: "text", placeholder: "+918064267760", help: "Assigned virtual phone number" },
        ]
      },
      {
        title: "Trunk & Routing Settings",
        icon: Sliders,
        fields: [
          { key: "apiBaseUrl", envKey: "VOBIZ_API_BASE_URL", label: "API Base URL", type: "url", defaultValue: "https://api.vobiz.ai/api/v1" },
          { key: "inboundTrunk", envKey: "VOBIZ_INBOUND_TRUNK_NAME", label: "Inbound Trunk Name", type: "text", defaultValue: "CRM" },
          { key: "outboundTrunk", envKey: "VOBIZ_OUTBOUND_TRUNK_NAME", label: "Outbound Trunk Name", type: "text", defaultValue: "CRM" },
          { key: "webhookPath", envKey: "VOBIZ_WEBHOOK_PATH", label: "Webhook Path", type: "text", defaultValue: "/vobiz/incoming" },
        ]
      }
    ]
  },
  LIVEKIT: {
    name: "LiveKit WebRTC PBX",
    description: "Realtime agent WebRTC audio bridge, egress recording, and SIP integration.",
    sections: [
      {
        title: "LiveKit Cluster Credentials",
        icon: Key,
        fields: [
          { key: "apiUrl", envKey: "LIVEKIT_API_URL", label: "LiveKit API URL", type: "url", placeholder: "https://pbx-27wznvd6.livekit.cloud" },
          { key: "wsUrl", envKey: "LIVEKIT_WS_URL", label: "LiveKit WebSocket URL", type: "text", placeholder: "wss://pbx-27wznvd6.livekit.cloud" },
          { key: "apiKey", envKey: "LIVEKIT_API_KEY", label: "API Key", type: "text", placeholder: "APIx5rfBfsCAVYe" },
          { key: "apiSecret", envKey: "LIVEKIT_API_SECRET", label: "API Secret", type: "password", isSecret: true, placeholder: "Leave blank to keep secret" },
        ]
      },
      {
        title: "SIP Gateway & Trunks",
        icon: Server,
        fields: [
          { key: "sipHost", envKey: "LIVEKIT_SIP_HOST", label: "SIP Host", type: "text", defaultValue: "4c0ct02u07s.sip.livekit.cloud" },
          { key: "sipUri", envKey: "LIVEKIT_SIP_URI", label: "SIP URI", type: "text", defaultValue: "sip:4c0ct02u07s.sip.livekit.cloud" },
          { key: "outboundTrunkId", envKey: "LIVEKIT_VOBIZ_OUTBOUND_TRUNK_ID", label: "Vobiz Outbound Trunk ID", type: "text", placeholder: "ST_xsShWdBTtHZR" },
          { key: "inboundTrunkId", envKey: "LIVEKIT_VOBIZ_INBOUND_TRUNK_ID", label: "Vobiz Inbound Trunk ID", type: "text", placeholder: "ST_QnCWUVduoZN5" },
        ]
      }
    ]
  },
  EXOTEL: {
    name: "Exotel Telephony Fallback",
    description: "Secondary PSTN failover trunk for emergency inbound patient calls.",
    sections: [
      {
        title: "Exotel API Credentials",
        icon: Key,
        fields: [
          { key: "apiKey", envKey: "EXOTEL_API_KEY", label: "API Key", type: "text" },
          { key: "apiToken", envKey: "EXOTEL_API_TOKEN", label: "API Token", type: "password", isSecret: true, placeholder: "Leave blank to keep token" },
          { key: "sid", envKey: "EXOTEL_SID", label: "Account SID", type: "text", placeholder: "akdevspace2" },
          { key: "subdomain", envKey: "EXOTEL_SUBDOMAIN", label: "API Subdomain", type: "text", defaultValue: "api.exotel.com" },
          { key: "callerId", envKey: "EXOTEL_CALLER_ID", label: "Caller ID", type: "text" },
        ]
      },
      {
        title: "Call Timing Limits",
        icon: Sliders,
        fields: [
          { key: "timeout", envKey: "EXOTEL_CALL_TIMEOUT", label: "Ring Timeout (sec)", type: "number", defaultValue: 45 },
          { key: "timelimit", envKey: "EXOTEL_CALL_TIMELIMIT", label: "Max Call Duration (sec)", type: "number", defaultValue: 900 },
        ]
      }
    ]
  },
  GEMINI: {
    name: "Google Gemini AI",
    description: "Clinical enquiry classification, intake intelligence, and conversation scoring.",
    sections: [
      {
        title: "AI Configuration",
        icon: Key,
        fields: [
          { key: "apiKey", envKey: "GEMINI_API_KEY", label: "Gemini API Key", type: "password", isSecret: true, placeholder: "Leave blank to preserve configured key", help: "API Key from Google AI Studio" },
          { 
            key: "model", 
            envKey: "GEMINI_MODEL", 
            label: "Active Intelligence Model", 
            type: "select", 
            defaultValue: "gemini-3.5-flash",
            options: [
              { label: "gemini-3.5-flash (Fast & Accurate)", value: "gemini-3.5-flash" },
              { label: "gemini-1.5-flash (Production Fallback)", value: "gemini-1.5-flash" },
              { label: "gemini-1.5-pro (High Reasoning)", value: "gemini-1.5-pro" },
            ],
            help: "Model used for conversation analysis and Enquiry Intelligence extraction"
          },
        ]
      }
    ]
  },
  SUPABASE: {
    name: "Supabase Postgres & S3 Storage",
    description: "Enterprise PostgreSQL database and call recording object storage.",
    sections: [
      {
        title: "Supabase Project Connection",
        icon: Server,
        fields: [
          { key: "url", envKey: "SUPABASE_URL", label: "Supabase URL", type: "url", placeholder: "https://ftrwxsubjepdxssfuzls.supabase.co" },
          { key: "serviceRoleKey", envKey: "SUPABASE_SERVICE_ROLE_KEY", label: "Service Role Key", type: "password", isSecret: true, placeholder: "Leave blank to keep key" },
        ]
      },
      {
        title: "S3 Call Recordings Bucket",
        icon: Globe,
        fields: [
          { key: "egressBucket", envKey: "EGRESS_S3_BUCKET", label: "Recordings S3 Bucket", type: "text", defaultValue: "call-recordings" },
          { key: "egressRegion", envKey: "EGRESS_S3_REGION", label: "S3 Region", type: "text", defaultValue: "ap-northeast-1" },
        ]
      }
    ]
  },
  FACEBOOK: {
    name: "Facebook Messenger API",
    description: "Connect Facebook Page direct messaging with customers.",
    sections: [
      {
        title: "Meta App & Page Credentials",
        icon: Key,
        fields: [
          { key: "pageId", envKey: "META_PAGE_ID", label: "Facebook Page ID", type: "text", placeholder: "106439255625400", help: "Facebook Page ID for inbound and outbound messages" },
          { key: "accessToken", envKey: "META_PAGE_ACCESS_TOKEN", label: "Page Access Token", type: "password", isSecret: true, placeholder: "EAAY...", help: "Page Access Token with pages_messaging scope" },
          { key: "appSecret", envKey: "META_APP_SECRET", label: "Meta App Secret", type: "password", isSecret: true, placeholder: "Leave blank to keep current secret", help: "App secret for verifying inbound webhook signatures" }
        ]
      },
      {
        title: "Webhooks",
        icon: Server,
        fields: [
          { key: "verifyToken", envKey: "META_VERIFY_TOKEN", label: "Webhook Verify Token", type: "text", placeholder: "my_verify_token" },
          { key: "callbackUrl", envKey: "META_WEBHOOK_URL", label: "Webhook URL", type: "url", defaultValue: "https://crm-uec-backend.onrender.com/webhook" }
        ]
      }
    ]
  },
  LINKEDIN: {
    name: "LinkedIn Lead & Messaging Hub",
    description: "Synchronize company page enquiries and prospective client messages.",
    sections: [
      {
        title: "LinkedIn API Credentials",
        icon: Key,
        fields: [
          { key: "clientId", envKey: "LINKEDIN_CLIENT_ID", label: "LinkedIn Client ID", type: "text", placeholder: "78xxxxxx" },
          { key: "clientSecret", envKey: "LINKEDIN_CLIENT_SECRET", label: "LinkedIn Client Secret", type: "password", isSecret: true, placeholder: "Leave blank to keep current secret" },
          { key: "organizationUrn", envKey: "LINKEDIN_ORGANIZATION_URN", label: "Organization URN", type: "text", placeholder: "urn:li:organization:1234567" },
          { key: "accessToken", envKey: "LINKEDIN_ACCESS_TOKEN", label: "OAuth Access Token", type: "password", isSecret: true, placeholder: "AQV..." }
        ]
      }
    ]
  },
  SMS: {
    name: "Enterprise SMS Gateway",
    description: "High-throughput transactional and campaign SMS gateway.",
    sections: [
      {
        title: "SMS Gateway Credentials",
        icon: Key,
        fields: [
          { key: "accountSid", envKey: "SMS_ACCOUNT_SID", label: "SMS Account SID / Username", type: "text", placeholder: "ACxxxxxx" },
          { key: "authToken", envKey: "SMS_AUTH_TOKEN", label: "SMS Auth Token / Password", type: "password", isSecret: true, placeholder: "Leave blank to keep token" },
          { key: "senderId", envKey: "SMS_SENDER_ID", label: "Sender Header ID (DLT)", type: "text", placeholder: "CRMTOOL" },
          { key: "dltEntityId", envKey: "DLT_ENTITY_ID", label: "Principal Entity ID (DLT)", type: "text", placeholder: "1701xxxxxxxxxxxx" }
        ]
      }
    ]
  },
  TWILIO: {
    name: "Twilio Telephony & Messaging",
    description: "International telephony trunking, SMS and WhatsApp business fallback.",
    sections: [
      {
        title: "Twilio API Credentials",
        icon: Key,
        fields: [
          { key: "accountSid", envKey: "TWILIO_ACCOUNT_SID", label: "Twilio Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
          { key: "authToken", envKey: "TWILIO_AUTH_TOKEN", label: "Twilio Auth Token", type: "password", isSecret: true, placeholder: "Leave blank to keep token" },
          { key: "fromNumber", envKey: "TWILIO_PHONE_NUMBER", label: "Twilio Phone / WhatsApp Number", type: "text", placeholder: "whatsapp:+14155238886" }
        ]
      }
    ]
  },
  WORDPRESS: {
    name: "WordPress & Web Form Gateways",
    description: "Ingest client leads and consultation requests from public websites.",
    sections: [
      {
        title: "Webhook Security & Authentication",
        icon: Server,
        fields: [
          { key: "webhookSecret", envKey: "WEBSITE_LEADS_SECRET", label: "Inbound Shared Secret / Signature Key", type: "password", isSecret: true, placeholder: "sec_xxxxxxxx_2026" },
          { key: "endpointUrl", envKey: "WORDPRESS_WEBHOOK_URL", label: "CRM Inbound Ingest Endpoint", type: "url", defaultValue: "https://crm-uec-backend.onrender.com/api/v1/webhooks/leads" },
          { key: "allowedDomains", envKey: "WORDPRESS_ALLOWED_DOMAINS", label: "Allowed Origin Domains", type: "text", placeholder: "anbusrisaihomenursing.com, thathapatti.com, uncftrust.org" }
        ]
      }
    ]
  },
  GOOGLE_ADS: {
    name: "Google Ads & Analytics",
    description: "Synchronize search ad conversions and caller lead attribution.",
    sections: [
      {
        title: "Google Ads API Credentials",
        icon: Key,
        fields: [
          { key: "customerId", envKey: "GOOGLE_ADS_CUSTOMER_ID", label: "Customer Account ID", type: "text", placeholder: "123-456-7890" },
          { key: "developerToken", envKey: "GOOGLE_ADS_DEVELOPER_TOKEN", label: "Developer Token", type: "password", isSecret: true, placeholder: "Leave blank to keep token" },
          { key: "clientId", envKey: "GOOGLE_ADS_CLIENT_ID", label: "OAuth Client ID", type: "text", placeholder: "xxxxxx.apps.googleusercontent.com" },
          { key: "clientSecret", envKey: "GOOGLE_ADS_CLIENT_SECRET", label: "OAuth Client Secret", type: "password", isSecret: true, placeholder: "Leave blank to keep secret" },
          { key: "refreshToken", envKey: "GOOGLE_ADS_REFRESH_TOKEN", label: "OAuth Refresh Token", type: "password", isSecret: true, placeholder: "1//xxxxxx" }
        ]
      }
    ]
  },
  MAILCHIMP: {
    name: "Mailchimp Newsletter & Campaigns",
    description: "Automate email subscriber lists and marketing audience synchronizations.",
    sections: [
      {
        title: "Mailchimp API Credentials",
        icon: Key,
        fields: [
          { key: "apiKey", envKey: "MAILCHIMP_API_KEY", label: "Mailchimp API Key", type: "password", isSecret: true, placeholder: "xxxxxx-us14" },
          { key: "serverPrefix", envKey: "MAILCHIMP_SERVER_PREFIX", label: "Server Prefix (Data Center)", type: "text", placeholder: "us14" },
          { key: "audienceId", envKey: "MAILCHIMP_AUDIENCE_ID", label: "Default Audience / List ID", type: "text", placeholder: "a1b2c3d4e5" }
        ]
      }
    ]
  }
};

export function IntegrationConfigModal({
  integration,
  isOpen,
  onClose,
  onSave,
  onTest
}: IntegrationConfigModalProps) {
  if (!isOpen) return null;

  const providerKey = integration.provider.toUpperCase().replace('META_', '');
  const schema = PROVIDER_CONFIG_SCHEMAS[providerKey] || PROVIDER_CONFIG_SCHEMAS['INSTAGRAM'];

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [enabled, setEnabled] = useState(integration.enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    const initialValues: Record<string, any> = {};
    const existingSettings = integration.settings || {};

    schema.sections.forEach(sec => {
      sec.fields.forEach(f => {
        if (!f.isSecret) {
          initialValues[f.key] = existingSettings[f.key] !== undefined 
            ? existingSettings[f.key] 
            : (f.defaultValue !== undefined ? f.defaultValue : '');
        }
      });
    });

    setFormValues(initialValues);
    setSecrets({});
    setEnabled(integration.enabled);
    setTestResult(null);
  }, [integration, schema]);

  const handleFieldChange = (key: string, value: any) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSecretChange = (key: string, value: string) => {
    setSecrets(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTest(integration.provider);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Connection test timed out' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Find the primary secret field if one was typed
      let primarySecret: string | undefined = undefined;
      for (const val of Object.values(secrets)) {
        if (val && val.trim().length > 0) {
          primarySecret = val.trim();
          break;
        }
      }

      await onSave(integration.provider, {
        enabled,
        settings: formValues,
        secret: primarySecret,
        unitId: integration.unitId || undefined
      });
      onClose();
    } catch (err) {
      console.error('Failed to save integration settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0a0a0a] border border-[#242424] rounded-2xl max-w-2xl w-full my-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1c1c1c] flex items-center justify-between bg-[#111]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{schema.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  integration.status === 'HEALTHY'
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                    : 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30'
                }`}>
                  {integration.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{schema.description}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f1f1f] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          
          {/* Status & Master Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-[#242424]">
            <div>
              <div className="font-semibold text-white">Enable Integration</div>
              <div className="text-[11px] text-slate-400">
                When enabled, CRM agents and automated workflows can communicate through this service.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Test Connectivity Result Banner */}
          {testResult && (
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <div>
                  <strong>{schema.name}:</strong> {testResult.success ? 'Real Provider Connection Verified' : 'Connection Failed'}
                  {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
                  {testResult.error && ` — ${testResult.error}`}
                </div>
              </div>
              <button type="button" onClick={() => setTestResult(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Configuration Sections */}
          {schema.sections.map((section, sIdx) => {
            const Icon = section.icon;
            return (
              <div key={sIdx} className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-[#222] pb-2 text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span>{section.title}</span>
                </div>

                <div className="space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-medium text-slate-300 flex items-center gap-1.5">
                          {field.label}
                          {field.isSecret && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Secret</span>
                          )}
                        </label>
                        <span className="font-mono text-[10px] text-slate-500 bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">
                          {field.envKey}
                        </span>
                      </div>

                      {/* Secret Field */}
                      {field.isSecret ? (
                        <div className="relative">
                          <input
                            type={showPassword[field.key] ? "text" : "password"}
                            value={secrets[field.key] || ''}
                            onChange={(e) => handleSecretChange(field.key, e.target.value)}
                            placeholder={field.placeholder || "Configured — leave blank to keep existing"}
                            className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none focus:border-primary transition-colors pr-20"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.key)}
                              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-[#222]"
                              title={showPassword[field.key] ? "Hide" : "Show"}
                            >
                              {showPassword[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          value={formValues[field.key] || field.defaultValue || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-primary transition-colors"
                        >
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-[#141414] text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type={field.type}
                            value={formValues[field.key] !== undefined ? formValues[field.key] : ''}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={field.placeholder || ''}
                            className="w-full bg-[#141414] border border-[#282828] rounded-xl px-3.5 py-2.5 text-white text-xs outline-none focus:border-primary transition-colors"
                          />
                          {field.type === 'url' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(formValues[field.key] || field.defaultValue || '', field.key)}
                              className="absolute right-2 text-slate-400 hover:text-white p-1 rounded hover:bg-[#222]"
                              title="Copy URL"
                            >
                              {copiedKey === field.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )}

                      {field.help && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{field.help}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1c1c1c] bg-[#111]/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRunTest}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-primary' : 'text-amber-400'}`} />
            {isTesting ? 'Running Live Check...' : 'Test Connection'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#161616] hover:bg-[#222] text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
