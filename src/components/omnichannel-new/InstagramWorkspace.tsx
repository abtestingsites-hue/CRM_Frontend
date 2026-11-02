"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MoreVertical, Paperclip, Send, Check, CheckCheck, 
  ChevronLeft, AlertCircle, RefreshCw, Phone, User, ExternalLink,
  Image as ImageIcon, HeartPulse, Clock, Sparkles
} from 'lucide-react';
import { useConversationStore } from '@/store/conversationStore';
import { apiFetch } from '@/lib/api';
import { OmnichannelEnquiryPanel } from './OmnichannelEnquiryPanel';

export function InstagramWorkspace({ platformDef, colors, onBack }: any) {
  const { 
    conversations, activeConversationId, messages, 
    addMessage, activeCustomerProfile 
  } = useConversationStore();
  
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeConv = conversations.find(c => c.id === activeConversationId);
  const activeMessages = activeConv ? (messages[activeConv.id] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content || !activeConv || isSending) return;
    
    setIsSending(true);
    setSendError(null);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: any = {
      id: tempId,
      sender: 'agent',
      content: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending'
    };
    addMessage(activeConv.id, tempMsg);
    if (!textToSend) setInputText('');

    try {
      const res = await apiFetch(`/api/messages/send-instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.id,
          message: content
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.error || 'Meta API rejected message');
      }

      // Update message status to sent
      addMessage(activeConv.id, {
        ...tempMsg,
        id: data.message?.id || tempId,
        status: 'sent',
        providerMessageId: data.providerMessageId
      });
    } catch (err: any) {
      console.error('Failed to send Instagram message:', err);
      setSendError(err.message || 'Failed to dispatch Instagram message');
      addMessage(activeConv.id, {
        ...tempMsg,
        status: 'failed',
        error: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRequestPhoneNumber = () => {
    const politeRequest = "Hello! Could you please share your contact phone number so our care coordinator can reach out regarding your care requirements?";
    setInputText(politeRequest);
  };

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center mb-4 text-white shadow-lg">
          <platformDef.icon className="w-8 h-8" />
        </div>
        <h2 className="text-xl text-white font-semibold">Instagram Direct</h2>
        <p className="mt-2 text-sm text-slate-400">Select an Instagram conversation to view and reply</p>
      </div>
    );
  }

  // Determine Customer Details
  const isEnriched = Boolean(activeCustomerProfile?.profileEnriched || activeConv.customerAvatar);
  const igHandle = activeCustomerProfile?.instagramUsername 
    || (activeConv.customerName?.startsWith('@') ? activeConv.customerName : null);
  const igUserId = activeCustomerProfile?.platformUserId || activeCustomerProfile?.phone || activeConv.customerId;
  
  // Real Phone Number checking
  const rawPhone = activeCustomerProfile?.phone || '';
  const hasRealPhone = rawPhone && !rawPhone.startsWith('ig_') && !rawPhone.includes('@') && rawPhone.length >= 8 && /^\+?[0-9\s\-]+$/.test(rawPhone);

  return (
    <div className="flex-1 flex h-full bg-[#030303]">
      {/* 1. CENTER CHAT PANEL (Instagram Direct Style) */}
      <div className="flex-1 flex flex-col border-r border-[#1c1c1c] h-full">
        
        {/* HEADER */}
        <div className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-[#1c1c1c] bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <button aria-label="Back to conversations" onClick={onBack} className="md:hidden p-1 mr-1 text-slate-400 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] border border-[#333]">
                {activeCustomerProfile?.instagramProfilePic || activeConv.customerAvatar ? (
                  <img src={activeCustomerProfile?.instagramProfilePic || activeConv.customerAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (activeConv.customerName?.replace(/^@/, '') || 'U').charAt(0).toUpperCase()
                )}
              </div>
              {isEnriched && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 text-white" title="Meta Enriched Identity">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white leading-tight">{activeConv.customerName}</span>
                {igHandle && (
                  <span className="text-xs text-pink-400 font-mono font-medium">{igHandle}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>IGSID: {igUserId ? String(igUserId).substring(0, 15) : 'Connected'}</span>
                <span>•</span>
                {hasRealPhone ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" /> {rawPhone}
                  </span>
                ) : (
                  <span className="text-slate-500">No phone number available</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            {!hasRealPhone && (
              <button
                onClick={handleRequestPhoneNumber}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-xs text-pink-300 font-medium transition-colors"
                title="Request customer phone number"
              >
                <Phone className="w-3 h-3 text-pink-400" />
                <span>Request Phone</span>
              </button>
            )}
            <button aria-label="Search Instagram chat" className="p-2 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <button aria-label="More options" className="p-2 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {sendError && (
          <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Meta Delivery Failed:</strong> {sendError}</span>
            </div>
            <button onClick={() => setSendError(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* CHAT THREAD */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[#020202]">
          <div className="flex justify-center mb-4">
            <span className="bg-[#121212] text-slate-500 text-[11px] font-semibold px-3 py-1 rounded-full border border-[#222]">
              Instagram Direct Messages
            </span>
          </div>

          <AnimatePresence>
            {activeMessages.map((msg) => {
              const isAgent = msg.sender === 'agent' || (msg as any).senderType === 'AGENT';
              const isSendingMsg = (msg.status as string) === 'sending';
              const isFailedMsg = (msg.status as string) === 'failed';

              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[72%] p-3.5 rounded-2xl shadow-sm text-sm break-words whitespace-pre-wrap ${
                      isAgent
                        ? 'bg-gradient-to-tr from-[#6b21a8] to-[#9333ea] text-white rounded-br-sm'
                        : 'bg-[#1a1a1a] border border-[#282828] text-slate-200 rounded-bl-sm'
                    }`}
                  >
                    {/* Image / Attachment preview */}
                    {msg.content?.includes('[IMAGE:') ? (
                      <div className="space-y-2">
                        {msg.content.split('\n').map((line: string, lIdx: number) => {
                          if (line.startsWith('[IMAGE:')) {
                            const url = line.replace('[IMAGE:', '').replace(']', '').trim();
                            return (
                              <img key={lIdx} src={url} alt="Attachment" className="rounded-lg max-h-60 w-auto object-cover border border-white/10" />
                            );
                          }
                          return <p key={lIdx}>{line}</p>;
                        })}
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>

                  {/* Timestamp & Delivery Status */}
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 px-1">
                    <span>{msg.timestamp || 'Just now'}</span>
                    {isAgent && (
                      isSendingMsg ? (
                        <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                      ) : isFailedMsg ? (
                        <div className="flex items-center gap-1 text-rose-400 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          <button onClick={() => handleSend(msg.content)} className="underline hover:text-rose-300">Retry</button>
                        </div>
                      ) : msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Check className="w-3 h-3 text-slate-400" />
                      )
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </AnimatePresence>
        </div>

        {/* COMPOSER */}
        <div className="p-4 bg-[#0a0a0a] border-t border-[#1c1c1c] shrink-0">
          <div className="flex items-end gap-2 bg-[#141414] border border-[#262626] rounded-2xl p-2 focus-within:border-purple-500 transition-colors">
            <button aria-label="Attach file" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              aria-label="Instagram message input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply to Instagram Direct..."
              className="flex-1 max-h-32 min-h-[38px] bg-transparent resize-none outline-none text-sm text-white py-2 px-1 placeholder-slate-500 leading-relaxed"
              rows={1}
            />
            <button aria-label="Attach image" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              aria-label="Send message"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-xl bg-gradient-to-tr from-[#6b21a8] to-[#9333ea] hover:opacity-90 text-white disabled:opacity-40 transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 2. RIGHT PANEL: OMNICHANNEL ENQUIRY INTELLIGENCE */}
      <OmnichannelEnquiryPanel
        conversation={activeConv}
        className="w-96 border-l border-[#1c1c1c] bg-[#050505] hidden lg:flex"
      />
    </div>
  );
}
