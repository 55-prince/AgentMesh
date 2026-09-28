import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "../config/llmModels.js";
import { getUnifiedMemoryContext, extractAndSaveUserFacts } from "../config/memory.js";
import { checkAgentLimit } from "../config/agentLimit.js";

const truncateSnippet = (text, maxLength = 350) => {
  if (!text) return "";
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + "...";
};

const sanitizeHistoryText = (content, maxLength = 700) => {
  if (!content) return "";
  let text = String(content);
  text = text.replace(/data:application\/[a-zA-Z0-9.\-_+]+;base64,[a-zA-Z0-9+/=]+/g, "[Attachment Document]");
  text = text.replace(/data:image\/[a-zA-Z0-9.\-_+]+;base64,[a-zA-Z0-9+/=]+/g, "[Attachment Image]");
  text = text.replace(/[A-Za-z0-9+/=]{150,}/g, "[Binary Data]");
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength) + "...";
};

export const chatAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "chatAgent");
    const llm = getModel("chatAgent");

    if (state.userId && state.prompt) {
      await extractAndSaveUserFacts(state.userId, state.prompt);
    }

    const rawResults =
      state.searchResults?.results ||
      (Array.isArray(state.searchResults) ? state.searchResults : null);
    const rawImages = state.searchResults?.images || state.images || [];

    const hasSearchResults = rawResults && rawResults.length > 0;

    const { messages: history, systemContextBlock } = await getUnifiedMemoryContext({
      conversationId: state.conversationId,
      userId: state.userId,
      prompt: state.prompt,
    });

    let systemPrompt = `You are an expert, concise AI assistant on the AgentMesh platform.

Guidelines:
1. Deliver direct, structured, and point-to-point answers. Keep responses under 250 words unless in-depth analysis is explicitly requested.
2. Avoid introductory/closing filler.
3. Use clean headings, bold keywords, and bullet points for fast reading.
4. If search data is provided:
   - Base answers directly on those facts.
   - Include up to 2 relevant visual markdown images if available.
   - List clickable source links at the end: - [Source Title](url).${systemContextBlock}`;

    const messages = [new SystemMessage(systemPrompt)];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4);
      recentHistory.forEach((msg) => {
        if (!msg || !msg.content) return;
        const sanitized = sanitizeHistoryText(msg.content, 350);
        if (!sanitized) return;
        if (msg.role === "user") {
          messages.push(new HumanMessage(sanitized));
        } else if (msg.role === "assistant") {
          messages.push(new AIMessage(sanitized));
        }
      });
    }

    let userMessage = state.prompt;

    if (hasSearchResults) {
      const lines = rawResults
        .slice(0, 3)
        .map(
          (r, i) =>
            `[${i + 1}] Title: ${r.title || "Web Result"}\nSnippet: ${truncateSnippet(r.content || r.snippet || "", 200)}\nURL: ${r.url || ""}`
        )
        .join("\n\n");

      let imageLines = "";
      if (Array.isArray(rawImages) && rawImages.length > 0) {
        const validImages = rawImages
          .slice(0, 2)
          .map((img) => (typeof img === "string" ? img : img.url || img.src || ""))
          .filter((url) => url && !url.includes("undefined") && url.startsWith("http"));

        if (validImages.length > 0) {
          imageLines = `\n\nImage URLs:\n${validImages.map((u, idx) => `- Image ${idx + 1}: ${u}`).join("\n")}`;
        }
      }

      userMessage = `Search Data:\n${lines}${imageLines}\n\nUser Query: ${state.prompt}`;
    }

    const lastMsg = messages[messages.length - 1];
    if (
      !lastMsg ||
      !(lastMsg instanceof HumanMessage) ||
      lastMsg.content !== userMessage
    ) {
      messages.push(new HumanMessage(userMessage));
    }

    const response = await llm.invoke(messages);
    let finalContent = response.content;
    let finalImages = rawImages || [];

    const promptLower = (state.prompt || "").toLowerCase();
    if (
      (promptLower.includes("generate an image") ||
        promptLower.includes("create an image") ||
        promptLower.includes("draw an image") ||
        promptLower.includes("with image") ||
        promptLower.includes("with picture")) &&
      !state._a2aMeta
    ) {
      try {
        const { delegateVisual } = await import("../a2a/a2aBus.js");
        const visualResult = await delegateVisual("chatAgent", state.prompt, state, 0);
        if (visualResult?.images?.length) {
          const imgUrl = visualResult.images[0];
          finalImages = [...finalImages, imgUrl];
          finalContent += `\n\n### 🎨 Generated Visual\n![Generated Art](${imgUrl})\n\n📥 [Download Visual Asset](${imgUrl})`;
        }
      } catch (a2aImgErr) {
        console.warn("[chatAgent] Visual delegation skipped:", a2aImgErr.message);
      }
    }

    return {
      ...state,
      aiResponse: finalContent,
      images: finalImages,
    };
  } catch (error) {
    console.error("Error in chatAgent:", error?.message || error);
    return {
      ...state,
      aiResponse: error?.data?.message || error?.message || "⚠️ An error occurred in chatAgent.",
      artifacts: [],
    };
  }
};

export default chatAgent;