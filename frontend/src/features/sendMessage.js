import { api } from "../../utils/axios.js";

export const sendMessage = async (arg1, arg2, arg3, arg4) => {
  try {
    let conversationId, prompt, agent, pdfAttachment, userId, isDeepResearch;

    if (typeof arg1 === "object" && arg1 !== null) {
      conversationId = arg1.conversationId;
      prompt = arg1.prompt;
      agent = arg1.agent || "auto";
      pdfAttachment = arg1.pdfAttachment || arg1.pdf || null;
      userId = arg1.userId || null;
      isDeepResearch = Boolean(arg1.isDeepResearch);
    } else {
      conversationId = arg1;
      prompt = arg2;
      agent = arg3 || "auto";
      pdfAttachment = arg4 || null;
      isDeepResearch = false;
    }

    const payload = {
      conversationId,
      prompt,
      agent,
      isDeepResearch,
    };

    if (userId) {
      payload.userId = userId;
    }

    if (pdfAttachment) {
      payload.pdfAttachment = pdfAttachment;
    }

    const response = await api.post("/api/agent/chat", payload);
    return response.data;
  } catch (error) {
    const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error.message;
    console.error("Error sending message to agent:", errorMsg);
    throw new Error(errorMsg);
  }
};
