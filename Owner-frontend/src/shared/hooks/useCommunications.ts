import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { fetchConversations, fetchMessages, fetchUnreadCount } from "../../core/communications";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  messageType: string;
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

export function useCommunications() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
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
    try {
      const { messages: data } = await fetchMessages(conversationId);
      setMessages(data);
      // After loading messages, they are marked as read in DB, so refresh local state
      loadUnreadCount();
      loadConversations();
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, [loadUnreadCount, loadConversations]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      loadConversations();
      loadUnreadCount();
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_message", (message: Message) => {
      // If we are currently viewing this conversation, add it to the list
      setMessages((prev) => {
        if (prev.length > 0 && prev[0].conversationId === message.conversationId) {
          return [...prev, message];
        }
        return prev;
      });

      // Refresh conversation list for latest preview and unread counts
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

  const selectConversation = useCallback((conversation: Conversation) => {
    if (activeConversation?.id) {
      socketRef.current?.emit("leave_conversation", activeConversation.id);
    }
    
    setActiveConversation(conversation);
    setMessages([]); // Clear previous
    loadMessages(conversation.id);
    socketRef.current?.emit("join_conversation", conversation.id);
  }, [activeConversation, loadMessages]);

  const sendMessage = useCallback((content: string) => {
    if (!activeConversation || !content.trim()) return;
    
    socketRef.current?.emit("send_message", {
      conversationId: activeConversation.id,
      content,
    });
  }, [activeConversation]);

  return {
    conversations,
    activeConversation,
    messages,
    unreadTotal,
    isConnected,
    selectConversation,
    sendMessage,
    refresh: loadConversations,
  };
}
