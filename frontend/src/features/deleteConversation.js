import { api } from "../../utils/axios.js";

export const deleteConversation = async (id) => {
  try {
    const response = await api.post("/api/chat/delete-conversation", { id });
    return response.data;
  } catch (error) {
    console.error("Error deleting conversation:", error?.response?.data || error.message);
    return null;
  }
};
