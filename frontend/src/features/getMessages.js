import { api } from "../../utils/axios.js";

export const getMessages = async (conversationId) => {
  if (!conversationId) return [];
  try {
    const response = await api.get(`/api/chat/get-messages/${conversationId}`);
    const msgs = Array.isArray(response?.data) ? response.data : [];
    return [...msgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching messages:", error?.response?.data?.message || error.message);
    return [];
  }
};
