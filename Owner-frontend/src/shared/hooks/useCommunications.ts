import { useCommunicationsContext } from "../context/CommunicationsContext";
export type { Message, Conversation } from "../context/CommunicationsContext";

export function useCommunications() {
  const context = useCommunicationsContext();
  
  return {
    conversations: context.conversations,
    activeConversation: context.activeConversation,
    messages: context.messages,
    unreadTotal: context.unreadTotal,
    isConnected: context.isConnected,
    isLoading: context.isLoading,
    selectConversation: context.selectConversation,
    sendMessage: context.sendMessage,
    refresh: context.refresh,
  };
}
