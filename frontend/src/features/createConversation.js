import { api } from "../../utils/axios.js";

export const createConversation = async (title = "New Chat") => {
  try {
    const res = await api.post("/api/chat/create-conversation", { title });
    return res.data;
  } catch (error) {
    try {
      const res = await api.get(`/api/chat/create-conversation?title=${encodeURIComponent(title)}`);
      return res.data;
    } catch (err) {
      console.error("Error creating conversation:", err?.response?.data || err.message);
      return null;
    }
  }
};