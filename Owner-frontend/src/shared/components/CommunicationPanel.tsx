import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Search, 
  Send, 
  X, 
  MoreVertical, 
  Users, 
  ArrowLeft
} from "lucide-react";
import { useDashboardTheme } from "../theme/ThemeProvider";
import { useCommunications, type Message } from "../hooks/useCommunications";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../modules/auth/hooks/useAuth";

interface CommunicationPanelProps {
  onClose: () => void;
}

export function CommunicationPanel({ onClose }: CommunicationPanelProps) {
  const { theme } = useDashboardTheme();
  const isDark = theme === "dark";
  const { user } = useAuth();
  
  const { 
    conversations, 
    activeConversation, 
    messages, 
    selectConversation, 
    sendMessage,
    isConnected,
    isLoading 
  } = useCommunications();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"All" | "Branches" | "Unread">("All");
  const [messageInput, setMessageInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch = c.branchName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "Unread") return matchesSearch && c.unreadCount > 0;
    if (activeTab === "Branches") return matchesSearch && c.type === "DIRECT";
    return matchesSearch;
  });

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessage(messageInput);
    setMessageInput("");
  };

  const renderMessage = (msg: Message, index: number) => {
    const isMine = msg.senderId === user?.id;
    const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId;
    
    return (
      <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} mb-3`}>
        {showHeader && !isMine && (
          <span className={`text-[10px] font-bold mb-1 ml-2 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
            {msg.senderName} • {msg.senderRole}
          </span>
        )}
        <div 
          className={`max-w-[85%] px-4 py-2.5 rounded-[20px] shadow-sm text-sm ${
            isMine 
              ? (isDark ? "bg-[#C9A96E] text-[#151821] rounded-tr-none" : "bg-[#8B5E3C] text-white rounded-tr-none")
              : (isDark ? "bg-[#1C2030] text-[#F0EBE3] border border-[rgba(255,255,255,0.05)] rounded-tl-none" : "bg-white text-gray-800 border border-[#E9E1D8] rounded-tl-none")
          }`}
        >
          {msg.message}
        </div>
        <span className={`text-[9px] mt-1 opacity-50 ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
        </span>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${isDark ? "bg-[#0F1115]" : "bg-[#F7F1EA]"}`}>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className={`flex flex-col w-full md:w-[320px] shrink-0 border-r ${
          isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#E8E1D8]"
        } ${activeConversation && "hidden md:flex"}`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
                Messages
              </h2>
              <button onClick={onClose} className="p-2 md:hidden">
                <X size={20} className={isDark ? "text-[#7A7572]" : "text-gray-500"} />
              </button>
            </div>
            
            <div className={`relative flex items-center rounded-xl px-3 py-2 ${
              isDark ? "bg-[#1C2030]" : "bg-white border border-[#E8E1D8]"
            }`}>
              <Search size={16} className={isDark ? "text-[#4A4744]" : "text-gray-400"} />
              <input 
                type="text" 
                placeholder="Search branches..."
                className="ml-2 bg-transparent border-none outline-none text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 pt-2 gap-4">
            {["All", "Branches", "Unread"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-2 text-xs font-bold tracking-wider transition-all border-b-2 ${
                  activeTab === tab 
                    ? (isDark ? "text-[#C9A96E] border-[#C9A96E]" : "text-[#8B5E3C] border-[#8B5E3C]")
                    : "text-gray-400 border-transparent"
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
            {conversations.length === 0 && !isConnected && (
               <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-16 rounded-xl animate-pulse ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
                  ))}
               </div>
            )}
            {filteredConversations.length > 0 ? (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-[18px] transition-all ${
                    activeConversation?.id === c.id 
                      ? (isDark ? "bg-[rgba(201,169,110,0.1)] border border-[rgba(201,169,110,0.2)]" : "bg-[#FDF4EB] border border-[#E9D9CC]")
                      : "hover:bg-[rgba(255,255,255,0.02)] border border-transparent"
                  }`}
                >
                  <div className={`shrink-0 h-11 w-11 rounded-[14px] flex items-center justify-center ${
                    c.type === "BROADCAST" 
                      ? (isDark ? "bg-[#C9A96E] text-[#151821]" : "bg-[#8B5E3C] text-white")
                      : (isDark ? "bg-[#1C2030] text-[#7A7572]" : "bg-white border border-[#E8E1D8] text-gray-500")
                  }`}>
                    {c.type === "BROADCAST" ? <Users size={20} /> : <MessageSquare size={20} />}
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[0.9rem] font-bold truncate ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
                        {c.branchName}
                      </span>
                      {c.lastMessageAt && (
                        <span className={`text-[10px] ${isDark ? "text-[#4A4744]" : "text-gray-400"}`}>
                          {formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: false })}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate ${isDark ? "text-[#7A7572]" : "text-gray-500"}`}>
                      {c.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  
                  {c.unreadCount > 0 && (
                    <div className={`h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDark ? "bg-[#C9A96E] text-[#151821]" : "bg-[#8B5E3C] text-white"
                    }`}>
                      {c.unreadCount}
                    </div>
                  )}
                </button>
              ))
            ) : conversations.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <MessageSquare size={32} />
                <p className="text-xs mt-2">No conversations found</p>
              </div>
            ) : isConnected && (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <MessageSquare size={32} />
                <p className="text-xs mt-2">No conversations</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col h-full bg-white/5 ${!activeConversation && "hidden md:flex"}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${
                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.06)]" : "bg-white border-[#E8E1D8]"
              }`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => selectConversation(null as any)} className="md:hidden">
                    <ArrowLeft size={20} className={isDark ? "text-[#F0EBE3]" : "text-gray-800"} />
                  </button>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    activeConversation.type === "BROADCAST" 
                      ? (isDark ? "bg-[#C9A96E]/20 text-[#C9A96E]" : "bg-[#8B5E3C]/10 text-[#8B5E3C]")
                      : (isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500")
                  }`}>
                    {activeConversation.type === "BROADCAST" ? <Users size={20} /> : <MessageSquare size={20} />}
                  </div>
                  <div>
                    <h3 className={`text-[1.05rem] font-bold leading-tight ${isDark ? "text-[#F0EBE3]" : "text-[#111827]"}`}>
                      {activeConversation.branchName}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-gray-400"}`} />
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-[#7A7572]" : "text-gray-400"}`}>
                        {activeConversation.type === "BROADCAST" ? "Broadcast" : "Direct Message"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className={`p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/5 text-[#7A7572]" : "hover:bg-gray-100 text-gray-500"}`}>
                    <MoreVertical size={20} />
                  </button>
                  <button onClick={onClose} className={`hidden md:block p-2 rounded-xl transition-all ${isDark ? "hover:bg-white/5 text-[#7A7572]" : "hover:bg-gray-100 text-gray-500"}`}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollContainerRef}
                className={`flex-1 overflow-y-auto p-6 scrollbar-hide ${isDark ? "bg-[#0F1115]" : "bg-[#FDFBF9]"}`}
              >
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`h-12 w-2/3 rounded-2xl animate-pulse ${i % 2 === 0 ? "ml-auto bg-[#C9A96E]/20" : "bg-white/5"}`} />
                    ))}
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, idx) => renderMessage(msg, idx))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <MessageSquare size={48} className="mb-4" />
                    <h4 className="font-bold">No messages yet</h4>
                    <p className="text-xs max-w-[200px] mt-2">
                      Start the conversation with {activeConversation.branchName}
                    </p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className={`p-4 border-t ${
                isDark ? "bg-[#151821] border-[rgba(255,255,255,0.06)]" : "bg-white border-[#E8E1D8]"
              }`}>
                <form onSubmit={handleSendMessage} className={`flex items-center gap-3 rounded-2xl px-4 py-2 ${
                  isDark ? "bg-[#1C2030]" : "bg-gray-50 border border-[#E8E1D8]"
                }`}>
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent border-none outline-none text-sm py-2"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                  />
                  <button 
                    disabled={!messageInput.trim()}
                    className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                      messageInput.trim() 
                        ? (isDark ? "bg-[#C9A96E] text-[#151821]" : "bg-[#8B5E3C] text-white shadow-lg")
                        : "opacity-30 cursor-not-allowed"
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
              <div className={`h-24 w-24 rounded-[32px] flex items-center justify-center mb-6 ${
                isDark ? "bg-white/5" : "bg-gray-100"
              }`}>
                <MessageSquare size={48} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Communication Hub</h3>
              <p className="max-w-[300px] text-sm">
                Select a branch conversation to start messaging. 
                Keep your salon operations synced in realtime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
