import { api } from "../../utils/axios.js";

export const updateConversation = async (id, title) => {
  try {
    const response = await api.post("/api/chat/update-conversation", {
      id,
      title,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating conversation:", error?.response?.data || error.message);
    return null;
  }
};
