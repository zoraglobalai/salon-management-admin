import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { fetchConversations, fetchMessages, fetchUnreadCount } from "../../core/communications";

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
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      loadConversations();
      loadUnreadCount();
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_message", (_message: Message) => {
      // Refresh everything to be sure
      loadConversations();
      loadUnreadCount();
    });

    socket.on("conversation_updated", () => {
      loadConversations();
      loadUnreadCount();
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

  useEffect(() => {
    if (!socketRef.current) return;

    const handleNewMessage = (message: Message) => {
      if (activeConversationRef.current?.id === message.conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socketRef.current.on("new_message", handleNewMessage);
    return () => {
      socketRef.current?.off("new_message", handleNewMessage);
    };
  }, []);

  const selectConversation = useCallback((conversation: Conversation | null) => {
    if (activeConversation?.id) {
      socketRef.current?.emit("leave_conversation", activeConversation.id);
    }
    
    setActiveConversation(conversation);
    setMessages([]); // Clear previous
    if (conversation) {
      loadMessages(conversation.id);
      socketRef.current?.emit("join_conversation", conversation.id);
    }
  }, [activeConversation, loadMessages]);

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
