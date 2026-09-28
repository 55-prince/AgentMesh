import axios from "axios";

export const getMessages = async (conversationId) => {
    try {
        if (!conversationId || !process.env.CHAT_PATH) return [];
        const response = await axios.get(`${process.env.CHAT_PATH}/get-messages/${conversationId}`);
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        return [];
    }
};

export default getMessages;