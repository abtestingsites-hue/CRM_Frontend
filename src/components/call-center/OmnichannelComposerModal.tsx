"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Send, Loader2, CheckCircle2, AlertTriangle, 
  MessageSquare, Mail, MessageCircle, Phone, Share2, 
  History, Check
} from 'lucide-react';
import { api } from '@/lib/api';

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export interface OmnichannelComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: any;
  initialChannel?: string;
  onMessageSent?: () => void;
}

export function OmnichannelComposerModal({
  isOpen,
  onClose,
  call,
  initialChannel = 'WHATSAPP',
  onMessageSent,
}: OmnichannelComposerModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([initialChannel]);
  const [messageText, setMessageText] = useState('');
  const [subjectText, setSubjectText] = useState('CRM Tool Customer Support Update');
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<Record<string, any> | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Conversation history
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Configured channels from backend
  const [configuredChannels, setConfiguredChannels] = useState<any[]>([
    { id: 'WHATSAPP', name: 'WhatsApp', icon: 'whatsapp', color: '#25D366' },
    { id: 'SMS', name: 'SMS', icon: 'sms', color: '#8B5CF6' },
    { id: 'EMAIL', name: 'Email', icon: 'email', color: '#F97316' },
    { id: 'INSTAGRAM', name: 'Instagram', icon: 'instagram', color: '#E4405F' },
    { id: 'MESSENGER', name: 'Messenger', icon: 'messenger', color: '#0084FF' },
  ]);

  useEffect(() => {
    if (!isOpen) return;

    setSelectedChannels([initialChannel]);
    setMessageText('');
    setSendResults(null);
    setGeneralError(null);

    // Fetch configured channels
    api
      .get('/telephony/channels')
      .then((res: any) => {
        if (res?.channels?.length) {
          setConfiguredChannels(res.channels);
        }
      })
      .catch(() => {});

    // Fetch conversation messages
    const convId = call?.conversationId || call?.id;
    if (convId) {
      setIsLoadingHistory(true);
      api
        .get(`/api/v1/conversations/${encodeURIComponent(convId)}/messages`)
        .then((res: any) => {
          if (Array.isArray(res)) setConversationHistory(res);
          else if (res && Array.isArray(res.messages)) setConversationHistory(res.messages);
        })
        .catch(() => {
          // Gracefully fallback to empty history if conversation record not yet created
          setConversationHistory([]);
        })
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, call, initialChannel]);

  if (!isOpen || !call) return null;

  // Resolve destinations by channel
  const rawPhone = call.callerPhone || call.customerPhone || call.callerNumber || call.customerDetails?.phone || call.lead?.phoneNumber;
  const cleanPhone = rawPhone && rawPhone !== 'Unknown' && !rawPhone.startsWith('ig_') ? rawPhone : null;
  const email = call.customerEmail || call.customerDetails?.email || call.lead?.email || null;
  const instagramId = call.customerDetails?.platformUserId || call.customer?.platformUserId || (rawPhone?.startsWith('ig_') ? rawPhone.slice(3) : null) || null;

  const recipientsByChannel: Record<string, string | null> = {
    WHATSAPP: cleanPhone,
    SMS: cleanPhone,
    EMAIL: email,
    INSTAGRAM: instagramId,
    MESSENGER: instagramId,
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== channelId);
      } else {
        return [...prev, channelId];
      }
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setGeneralError('Please enter a message to dispatch');
      return;
    }
    if (selectedChannels.length === 0) {
      setGeneralError('Please select at least one channel to send');
      return;
    }

    // Verify recipients for selected channels
    for (const ch of selectedChannels) {
      if (!recipientsByChannel[ch]) {
        setGeneralError(`Cannot send via ${ch}: No valid ${ch === 'EMAIL' ? 'email' : ch === 'INSTAGRAM' ? 'Instagram ID' : 'phone number'} on file for this contact.`);
        return;
      }
    }

    setIsSending(true);
    setGeneralError(null);
    setSendResults(null);

    try {
      const payload: any = {
        channels: selectedChannels,
        message: messageText.trim(),
        subject: subjectText.trim(),
        recipient: cleanPhone || email || instagramId,
        recipientsByChannel,
        leadId: call.leadId || undefined,
      };

      const res: any = await api.post(`/telephony/calls/${encodeURIComponent(call.id)}/send-multichannel`, payload);

      if (res && res.results) {
        setSendResults(res.results);
        if (res.allSucceeded) {
          setMessageText('');
          if (onMessageSent) onMessageSent();
          setTimeout(() => {
            onClose();
          }, 1800);
        }
      } else {
        setGeneralError('Failed to receive dispatch response from backend');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Delivery request failed';
      setGeneralError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setIsSending(false);
    }
  };

  const renderChannelIcon = (channelId: string, sizeClass = "w-4 h-4") => {
    switch (channelId.toUpperCase()) {
      case 'WHATSAPP':
        return <MessageCircle className={`${sizeClass} text-emerald-400`} />;
      case 'INSTAGRAM':
        return <InstagramIcon className={`${sizeClass} text-pink-400`} />;
      case 'EMAIL':
        return <Mail className={`${sizeClass} text-amber-400`} />;
      case 'SMS':
        return <MessageSquare className={`${sizeClass} text-purple-400`} />;
      case 'MESSENGER':
      case 'FACEBOOK':
        return <Share2 className={`${sizeClass} text-blue-400`} />;
      default:
        return <MessageSquare className={`${sizeClass} text-slate-400`} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0d1217] border border-[#233342] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c2936] bg-[#111821]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Omnichannel Message Dispatcher</span>
                <span className="px-2 py-0.5 rounded-full bg-[#1c2936] text-[10px] text-slate-300 font-mono">
                  {call.callerName || 'Customer'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Send unified responses across WhatsApp, SMS, Email, and Social platforms with delivery tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2d3d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {generalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* 1. Target Contact Profile */}
          <div className="p-3.5 rounded-xl bg-[#131b24] border border-[#233342] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Contact</span>
              <strong className="text-white text-sm block">{call.callerName || 'Customer'}</strong>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Phone / WhatsApp</span>
              <span className="font-mono text-slate-200 block">{cleanPhone || <span className="text-slate-500 italic">Not on file</span>}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Email</span>
              <span className="text-slate-200 block">{email || <span className="text-slate-500 italic">Not on file</span>}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Instagram</span>
              <span className="text-slate-200 block">{instagramId ? `@${instagramId}` : <span className="text-slate-500 italic">Not on file</span>}</span>
            </div>
          </div>

          {/* 2. Channel Selector (Multi-Channel Sending) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Select Delivery Channel(s) — Multi-Channel Capable</span>
              <span className="text-[11px] text-slate-500">
                {selectedChannels.length} channel{selectedChannels.length > 1 ? 's' : ''} selected
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {configuredChannels.map((ch) => {
                const isSelected = selectedChannels.includes(ch.id);
                const hasRecipient = Boolean(recipientsByChannel[ch.id]);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    disabled={!hasRecipient}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500/40 text-white shadow-sm ring-1 ring-orange-500/30'
                        : hasRecipient
                          ? 'bg-[#121a22] border-[#22313f] text-slate-400 hover:bg-[#182430] hover:text-slate-200'
                          : 'bg-[#0f141a] border-[#18212b] text-slate-600 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="mt-0.5">{renderChannelIcon(ch.id, "w-4 h-4")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs block truncate">{ch.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] block truncate text-slate-500">
                        {hasRecipient ? recipientsByChannel[ch.id] : 'No contact data'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Subject (If Email Selected) */}
          {selectedChannels.includes('EMAIL') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email Subject</label>
              <input
                type="text"
                value={subjectText}
                onChange={(e) => setSubjectText(e.target.value)}
                placeholder="Enter email subject line..."
                className="w-full bg-[#121b24] border border-[#233342] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
              />
            </div>
          )}

          {/* 4. Message Content */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Message Content *</label>
              <span className="text-[10px] text-slate-500">{messageText.length} characters</span>
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write response message to customer... Actual message will be dispatched via official providers."
              rows={4}
              required
              className="w-full bg-[#121b24] border border-[#233342] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
            />
          </div>

          {/* 5. Dispatch Results per Channel */}
          {sendResults && (
            <div className="p-3.5 rounded-xl bg-[#121b24] border border-[#233342] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Independent Delivery Status
              </span>
              <div className="space-y-1.5">
                {Object.keys(sendResults).map((ch) => {
                  const res = sendResults[ch];
                  const isOk = res.success;
                  return (
                    <div
                      key={ch}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        isOk
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {renderChannelIcon(ch, "w-3.5 h-3.5")}
                        <strong className="uppercase">{ch}:</strong>
                        <span>{isOk ? 'Sent' : 'Failed'}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono truncate max-w-[280px]">
                        {isOk
                          ? `MID: ${res.providerMessageId || 'Accepted'}`
                          : res.error || 'Provider rejected'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Conversation History Drawer Snippet */}
          {conversationHistory.length > 0 && (
            <div className="pt-2 border-t border-[#1c2936] space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-orange-400" />
                <span>Recent Conversation History</span>
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#101720] border border-[#1f2b38]">
                {conversationHistory.slice(-4).map((m: any, idx: number) => (
                  <div
                    key={m.id || idx}
                    className={`p-2 rounded-lg text-xs ${
                      m.sender === 'agent'
                        ? 'bg-orange-500/10 border border-orange-500/20 text-orange-200 ml-4'
                        : 'bg-[#15202b] text-slate-300 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <strong className="capitalize">{m.sender}</strong>
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1c2936] bg-[#111821] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {selectedChannels.length > 1
              ? `Multi-channel dispatch will track each provider delivery separately`
              : `Dispatched via ${selectedChannels[0] || 'channel'} provider`}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-[#141d27] hover:bg-[#1c2936] text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !messageText.trim() || selectedChannels.length === 0}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Response</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

