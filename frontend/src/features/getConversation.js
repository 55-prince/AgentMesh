import { api } from "../../utils/axios.js";

export const getConversation = async () => {
  try {
    const response = await api.get("/api/chat/get-conversation");
    return response.data || [];
  } catch (error) {
    console.error("Error fetching conversations:", error?.response?.data || error.message);
    return [];
  }
};