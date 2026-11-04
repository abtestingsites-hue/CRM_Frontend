import { create } from 'zustand';
import { apiFetch, API_BASE_URL } from '@/lib/api';

export type ChannelType = 'whatsapp' | 'voice' | 'email' | 'sms' | 'chat' | 'instagram' | 'messenger';

export interface Message {
  id: string;
  sender: 'agent' | 'customer' | 'system';
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  aiSuggested?: boolean;
  isAiSuggested?: boolean;
  attachmentType?: string;
  attachmentUrl?: string;
  transcript?: string;
  translation?: string;
  detectedLanguage?: string;
  aiIntent?: string;
}

export interface PlatformIdentity {
  id: string;
  customerId: string;
  platform: string;
  platformUserId: string;
  username?: string;
  profilePicture?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes: { content: string; createdAt: string }[];
  tickets: { id: string; category: string; status: string; priority: string; createdAt: string }[];
  aiSummary?: { summaryText: string; sentimentScore: string; riskLevel: string };
  platform?: string;
  platformUserId?: string;
  instagramUsername?: string;
  instagramProfilePic?: string;
  profileEnriched?: boolean;
  lastProfileSync?: string;
  platformIdentities?: PlatformIdentity[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAvatar?: string;
  channel: ChannelType;
  lastMessage: string;
  unreadCount: number;
  priority: 'low' | 'normal' | 'medium' | 'high' | 'emergency';
  status: 'open' | 'pending' | 'resolved';
  timestamp: string;
  foundation?: string;
  enquiryCategory?: string;
  primaryService?: string;
  subServices?: string[];
  leadId?: string;
  lead?: any;
  classificationConfidence?: number;
  isClassificationConfirmed?: boolean;
  missingInfo?: string[];
  intakeMetadata?: any;
}

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  typingStatus: Record<string, boolean>;
  activeCustomerProfile: CustomerProfile | null;
  isLoading: boolean;
  isMessagesLoading: boolean;
  isCustomerLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchCustomerProfile: (customerId: string) => Promise<void>;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  handleIncomingMessage: (payload: any) => void;
  markAsRead: (conversationId: string) => void;
  setTypingStatus: (conversationId: string, isTyping: boolean) => void;
  updateCustomerIdentity: (payload: { customerId: string; instagramUsername: string; instagramProfilePic: string; name: string }) => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingStatus: {},
  activeCustomerProfile: null,
  isLoading: false,
  isMessagesLoading: false,
  isCustomerLoading: false,
  error: null,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFetch(`/api/v1/conversations`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      set({ conversations: data, isLoading: false });
    } catch (err: any) {
      console.error('Failed to fetch conversations from API:', err);
      set({ error: err.message || 'Failed to fetch conversations', conversations: [], isLoading: false });
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isMessagesLoading: true, error: null });
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await apiFetch(`/api/v1/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      set((state) => ({
        messages: { ...state.messages, [conversationId]: data },
        isMessagesLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isMessagesLoading: false });
    }
  },

  fetchCustomerProfile: async (customerId: string) => {
    set({ isCustomerLoading: true, error: null });
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const res = await apiFetch(`/api/v1/customers/${customerId}`);
      if (!res.ok) throw new Error('Failed to fetch customer profile');
      const data = await res.json();
      set({ activeCustomerProfile: data, isCustomerLoading: false });
    } catch (err: any) {
      set({ error: err.message, isCustomerLoading: false, activeCustomerProfile: null });
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    const conversation = get().conversations.find(c => c.id === id);
    if (conversation) {
      get().fetchCustomerProfile(conversation.customerId);
    }
  },
  addMessage: (conversationId, message) => set((state) => {
    const currentMessages = state.messages[conversationId] || [];
    const msgObj = message as any;

    // Normalize message properties
    const normalizedSender = (msgObj.sender || msgObj.senderType?.toLowerCase() || 'agent') as 'agent' | 'customer' | 'system';

    let normalizedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawTime = msgObj.createdAt || msgObj.timestamp;
    if (rawTime) {
      const parsed = new Date(rawTime);
      normalizedTimestamp = (!isNaN(parsed.getTime()) && String(rawTime).includes('T'))
        ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : rawTime;
    }

    const normalizedStatus = (msgObj.status?.toLowerCase() || 'sent') as 'sent' | 'delivered' | 'read';

    const normalizedMsg: Message = {
      id: msgObj.id,
      sender: normalizedSender,
      content: msgObj.content,
      timestamp: normalizedTimestamp,
      status: normalizedStatus,
      aiSuggested: msgObj.aiSuggested || msgObj.isAiSuggested || false,
      isAiSuggested: msgObj.aiSuggested || msgObj.isAiSuggested || false,
      attachmentType: msgObj.attachmentType,
      attachmentUrl: msgObj.attachmentUrl,
      transcript: msgObj.transcript,
      translation: msgObj.translation,
      detectedLanguage: msgObj.detectedLanguage,
      aiIntent: msgObj.aiIntent
    };

    // Check if message is already present by ID
    const existingIndexById = currentMessages.findIndex((m) => m.id === normalizedMsg.id);
    if (existingIndexById !== -1) {
      // Update existing message (e.g., AI transcript added)
      const updatedList = [...currentMessages];
      updatedList[existingIndexById] = { ...updatedList[existingIndexById], ...normalizedMsg };
      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedList
        }
      };
    }

    // Check if there is an optimistic/temporary message matching this content and sender
    const isTempId = (id: string) => /^\d+$/.test(id);
    const tempIndex = currentMessages.findIndex(
      (m) => isTempId(m.id) && m.sender === normalizedMsg.sender && m.content === normalizedMsg.content
    );

    let updatedList;
    if (tempIndex !== -1) {
      // Replace optimistic message with the normalized database message
      updatedList = [...currentMessages];
      updatedList[tempIndex] = normalizedMsg;
    } else {
      // Append the new message
      updatedList = [...currentMessages, normalizedMsg];
    }

    return {
      messages: {
        ...state.messages,
        [conversationId]: updatedList
      }
    };
  }),

  handleIncomingMessage: (payload) => set((state) => {
    const { conversation, message, customer } = payload;
    const msgObj = message as any;

    const existingMessages = state.messages[conversation.id] || [];

    // Normalize message properties
    const normalizedSender = (msgObj.sender || msgObj.senderType?.toLowerCase() || 'customer') as 'agent' | 'customer' | 'system';

    let normalizedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const rawTime = msgObj.createdAt || msgObj.timestamp;
    if (rawTime) {
      const parsed = new Date(rawTime);
      normalizedTimestamp = (!isNaN(parsed.getTime()) && String(rawTime).includes('T'))
        ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : rawTime;
    }

    const normalizedStatus = (msgObj.status?.toLowerCase() || 'delivered') as 'sent' | 'delivered' | 'read';

    const normalizedMsg: Message = {
      id: msgObj.id,
      sender: normalizedSender,
      content: msgObj.content,
      timestamp: normalizedTimestamp,
      status: normalizedStatus,
      aiSuggested: msgObj.aiSuggested || msgObj.isAiSuggested || false,
      isAiSuggested: msgObj.aiSuggested || msgObj.isAiSuggested || false,
      attachmentType: msgObj.attachmentType,
      attachmentUrl: msgObj.attachmentUrl,
      transcript: msgObj.transcript,
      translation: msgObj.translation,
      detectedLanguage: msgObj.detectedLanguage,
      aiIntent: msgObj.aiIntent
    };

    // Check if message is already present by ID
    const existingIndexById = existingMessages.findIndex((m) => m.id === normalizedMsg.id);
    if (existingIndexById !== -1) {
      const updatedList = [...existingMessages];
      updatedList[existingIndexById] = { ...updatedList[existingIndexById], ...normalizedMsg };
      
      const updatedMessages = {
        ...state.messages,
        [conversation.id]: updatedList
      };

      return {
        messages: updatedMessages
      };
    }

    // Check if there is an optimistic/temporary message matching this content and sender
    const isTempId = (id: string) => /^\d+$/.test(id);
    const tempIndex = existingMessages.findIndex(
      (m) => isTempId(m.id) && m.sender === normalizedMsg.sender && m.content === normalizedMsg.content
    );

    let updatedList;
    if (tempIndex !== -1) {
      updatedList = [...existingMessages];
      updatedList[tempIndex] = normalizedMsg;
    } else {
      updatedList = [...existingMessages, normalizedMsg];
    }

    const updatedMessages = {
      ...state.messages,
      [conversation.id]: updatedList
    };

    // 2. Format conversation for the Inbox
    const formattedConv: Conversation = {
      id: conversation.id,
      customerId: customer.id,
      customerName: customer.name,
      customerAvatar: customer.instagramProfilePic || null,
      customerEmail: customer.email || 'unknown@example.com',
      channel: conversation.channel.toLowerCase() as ChannelType,
      lastMessage: message.content,
      unreadCount: state.activeConversationId === conversation.id ? 0 : conversation.unreadCount,
      priority: conversation.priority.toLowerCase(),
      status: conversation.status.toLowerCase(),
      timestamp: normalizedTimestamp,
    };

    // 3. Reorder conversations: Move to top or add new
    const existingIndex = state.conversations.findIndex(c => c.id === conversation.id);
    let newConversations = [...state.conversations];

    if (existingIndex > -1) {
      newConversations.splice(existingIndex, 1);
    }
    newConversations.unshift(formattedConv);

    return {
      messages: updatedMessages,
      conversations: newConversations
    };
  }),

  markAsRead: async (conversationId) => {
    // Optimistic UI update
    set((state) => ({
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    }));

    try {
      let baseUrl = process.env.NEXT_PUBLIC_API_URL || `${API_BASE_URL}`;
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

      const response = await apiFetch(`${baseUrl}/api/v1/conversations/${conversationId}/read`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
    }
  },

  setTypingStatus: (conversationId, isTyping) => set((state) => ({
    typingStatus: {
      ...state.typingStatus,
      [conversationId]: isTyping
    }
  })),

  updateCustomerIdentity: (payload) => set((state) => {
    const { customerId, instagramUsername, instagramProfilePic, name, enrichmentFailed } = payload as any;

    // Update activeCustomerProfile if it matches
    let updatedProfile = state.activeCustomerProfile;
    if (updatedProfile && updatedProfile.id === customerId) {
      updatedProfile = {
        ...updatedProfile,
        name: name,
        instagramUsername: instagramUsername,
        instagramProfilePic: instagramProfilePic,
        profileEnriched: !enrichmentFailed,
        // Also update or add to platformIdentities
        platformIdentities: [
          ...(updatedProfile.platformIdentities || []).filter(pi => pi.platform !== 'INSTAGRAM'),
          {
            id: 'ig-identity',
            customerId,
            platform: 'INSTAGRAM',
            platformUserId: updatedProfile.phone || '',
            username: instagramUsername,
            profilePicture: instagramProfilePic,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };
    }

    // Update conversations list customer name if matched
    const updatedConversations = state.conversations.map(c => {
      if (c.customerId === customerId) {
        return {
          ...c,
          customerName: name,
          customerAvatar: instagramProfilePic
        };
      }
      return c;
    });

    return {
      activeCustomerProfile: updatedProfile,
      conversations: updatedConversations
    };
  }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('crm-unit-changed', () => {
    useConversationStore.getState().fetchConversations();
  });
}
