import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { fetchConversations, fetchMessages, fetchUnreadCount } from "../../core/communications";
import { clearOwnerSession } from "../../modules/auth/services/sessionSync";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  tenantId: string;
  type: "DIRECT" | "BROADCAST";
  branchId?: string;
  branchName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface CommunicationsContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  unreadTotal: number;
  isConnected: boolean;
  isLoading: boolean;
  selectConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string) => void;
  refresh: () => Promise<void>;
}

const CommunicationsContext = createContext<CommunicationsContextType | undefined>(undefined);

export function CommunicationsProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: data } = await fetchConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { unreadCount } = await fetchUnreadCount();
      setUnreadTotal(unreadCount);
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { messages: data } = await fetchMessages(conversationId);
      setMessages(data);
      // After loading messages, they are marked as read in DB, so refresh local state
      loadUnreadCount();
      loadConversations();
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [loadUnreadCount, loadConversations]);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("owner_token");
    const userStr = sessionStorage.getItem("owner_user");
    if (!token) return;

    let userId = "";
    let userRole = "";
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        userId = u.id;
        userRole = u.role;
      } catch (e) {
        console.error("Failed to parse user from session storage", e);
      }
    }

    const socket = io(SOCKET_URL, {
      auth: { token, userId, role: userRole },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      loadConversations();
      loadUnreadCount();
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_message", (message: Message) => {
      // Append to current chat if we are viewing it
      if (activeConversationRef.current?.id === message.conversationId) {
        setMessages((prev) => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      
      // Refresh list to update latest message text and unread count
      loadConversations();
      loadUnreadCount();
    });

    socket.on("conversation_updated", () => {
      loadConversations();
      loadUnreadCount();
    });

    socket.on("force_logout", () => {
      clearOwnerSession({ broadcast: true, redirectToLogin: true });
      socket.disconnect();
    });

    return () => {
      socket.disconnect();
    };
  }, [loadConversations, loadUnreadCount]);

  // Use a Ref to keep track of activeConversation for socket listener
  const activeConversationRef = useRef<Conversation | null>(null);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Handle joining and leaving conversation rooms
  const prevConversationId = useRef<string | null>(null);
  useEffect(() => {
    const currentId = activeConversation?.id;
    if (socketRef.current) {
      if (prevConversationId.current && prevConversationId.current !== currentId) {
        socketRef.current.emit("leave_conversation", prevConversationId.current);
      }
      if (currentId && prevConversationId.current !== currentId) {
        socketRef.current.emit("join_conversation", currentId);
      }
    }
    prevConversationId.current = currentId || null;
  }, [activeConversation?.id, isConnected]); // Also re-run if socket reconnects

  const selectConversation = useCallback((conversation: Conversation | null) => {
    setActiveConversation(conversation);
    setMessages([]); // Clear previous
    if (conversation) {
      loadMessages(conversation.id);
    }
  }, [loadMessages]);

  const sendMessage = useCallback((content: string) => {
    if (!activeConversation || !content.trim() || !socketRef.current) return;
    
    // Optimistic Update would go here if we wanted to add it to state immediately
    // For now, we emit and wait for echo (it's usually fast enough)
    
    // We don't actually add to messages yet because the socket 'new_message' will echo it back
    // However, if we want "instant" feeling, we can add it and then replace it
    // For now, let's just emit and wait for echo (it's usually fast enough)
    
    socketRef.current.emit("send_message", {
      conversationId: activeConversation.id,
      content,
    });
  }, [activeConversation]);

  const refresh = useCallback(async () => {
    await loadConversations();
    await loadUnreadCount();
  }, [loadConversations, loadUnreadCount]);

  return (
    <CommunicationsContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      unreadTotal,
      isConnected,
      isLoading,
      selectConversation,
      sendMessage,
      refresh
    }}>
      {children}
    </CommunicationsContext.Provider>
  );
}

export function useCommunicationsContext() {
  const context = useContext(CommunicationsContext);
  if (context === undefined) {
    throw new Error("useCommunicationsContext must be used within a CommunicationsProvider");
  }
  return context;
}
