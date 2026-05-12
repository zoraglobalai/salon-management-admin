import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

const getAuthHeader = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("owner_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchConversations = async () => {
  const response = await axios.get(`${API_URL}/api/communications/conversations`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchMessages = async (conversationId: string) => {
  const response = await axios.get(`${API_URL}/api/communications/messages/${conversationId}`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const fetchUnreadCount = async () => {
  const response = await axios.get(`${API_URL}/api/communications/unread`, {
    headers: getAuthHeader(),
  });
  return response.data;
};

export const initConversation = async (type: "DIRECT" | "BROADCAST", branchId?: string) => {
  const response = await axios.post(`${API_URL}/api/communications/init`, 
    { type, branchId },
    { headers: getAuthHeader() }
  );
  return response.data;
};
