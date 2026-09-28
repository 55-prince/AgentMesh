import redis from "../../../shared/redis.js";
import { getMessages } from "../utils/getMessages.js";
import { vectorStore } from "./vectorDb.js";
import { getModel } from "./llmModels.js";
import { HumanMessage } from "@langchain/core/messages";

const sanitizeMemoryText = (text) => {
  if (!text) return "";
  let s = String(text);
  s = s.replace(/data:application\/[a-zA-Z0-9.\-_+]+;base64,[a-zA-Z0-9+/=]+/g, "[Attachment Document]");
  s = s.replace(/data:image\/[a-zA-Z0-9.\-_+]+;base64,[a-zA-Z0-9+/=]+/g, "[Attachment Image]");
  s = s.replace(/[A-Za-z0-9+/=]{200,}/g, "[Binary Data]");
  return s;
};

export const getMemory = async (conversationId) => {
  try {
    if (!conversationId) return [];
    const key = `messages-${conversationId}`;
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed)
        ? parsed.map((m) => ({
            ...m,
            content: sanitizeMemoryText(m.content),
          }))
        : [];
    }

    const messages = await getMessages(conversationId);
    if (messages && Array.isArray(messages)) {
      const sanitizedList = messages.map((m) => ({
        ...m,
        content: sanitizeMemoryText(m.content),
      }));
      await redis.set(key, JSON.stringify(sanitizedList), "EX", 24 * 60 * 60);
      return sanitizedList;
    }
    return [];
  } catch (error) {
    return [];
  }
};

export const addMessage = async (conversationId, role, content, artifacts = [], userId = null) => {
  try {
    if (!conversationId) return null;
    const key = `messages-${conversationId}`;
    const cached = await redis.get(key);
    const messages = cached ? JSON.parse(cached) : [];

    const safeContent = sanitizeMemoryText(content);

    messages.push({
      role,
      content: safeContent,
      artifacts: Array.isArray(artifacts) ? artifacts : [],
      timestamp: Date.now(),
    });

    if (messages.length > 8) {
      messages.shift();
    }
    await redis.set(key, JSON.stringify(messages), "EX", 24 * 60 * 60);

    if (Array.isArray(artifacts) && artifacts.length > 0) {
      for (const art of artifacts) {
        await saveArtifactMemory(conversationId, art);
      }
    }

    if (role === "user" && userId) {
      extractAndSaveUserFacts(userId, content).catch(() => {});
    }

    if (messages.length >= 3) {
      updateConversationSummary(conversationId, messages).catch(() => {});
    }

    return messages;
  } catch (error) {
    return null;
  }
};

export const getConversationSummary = async (conversationId) => {
  try {
    if (!conversationId) return "";
    const key = `summary-${conversationId}`;
    const cached = await redis.get(key);
    return cached || "";
  } catch (error) {
    return "";
  }
};

export const updateConversationSummary = async (conversationId, messages = []) => {
  try {
    if (!conversationId || !Array.isArray(messages) || messages.length < 2) return "";

    const existingSummary = await getConversationSummary(conversationId);

    const recentTranscript = messages
      .slice(-4)
      .map((m) => `${m.role.toUpperCase()}: ${String(m.content || "").slice(0, 300)}`)
      .join("\n");

    const llm = getModel("intent");
    const prompt = `You are the Recursive Memory Manager on AgentMesh.
Synthesize and update the cumulative running executive summary of this conversation by folding the previous summary together with the newest conversation turns.

PREVIOUS CUMULATIVE SUMMARY:
${existingSummary ? existingSummary : "None (Initial conversation state)."}

NEWEST CONVERSATION TURNS:
${recentTranscript}

INSTRUCTIONS:
1. Retain all critical long-term facts, domain topics, user preferences, technical constraints, decisions, and goals from the previous summary.
2. Incorporate key developments, questions, and artifacts from the newest turns.
3. Keep the updated running summary dense, factual, and tightly bounded (3-4 concise sentences max). Do not add introductory conversational filler.

UPDATED RUNNING SUMMARY:`;

    const res = await llm.invoke([new HumanMessage(prompt)]);
    const summary = (res?.content || "").trim();

    if (summary) {
      const key = `summary-${conversationId}`;
      await redis.set(key, summary, "EX", 24 * 60 * 60);
    }
    return summary;
  } catch (error) {
    return "";
  }
};

export const getEnrichedMemory = async (conversationId) => {
  try {
    const [messages, summary] = await Promise.all([
      getMemory(conversationId),
      getConversationSummary(conversationId),
    ]);
    return {
      messages,
      summary,
    };
  } catch (error) {
    return { messages: [], summary: "" };
  }
};

export const saveArtifactMemory = async (conversationId, artifact) => {
  try {
    if (!conversationId || !artifact) return;
    const key = `artifact-memory-${conversationId}`;
    const title = artifact.title || artifact.name || "Artifact";
    const summary = artifact.summary || artifact.content?.slice(0, 300) || "";
    const type = artifact.type || artifact.language || "document";

    const entry = {
      title,
      summary,
      type,
      timestamp: Date.now(),
    };

    const cached = await redis.get(key);
    const list = cached ? JSON.parse(cached) : [];
    list.push(entry);
    if (list.length > 10) list.shift();

    await redis.set(key, JSON.stringify(list), "EX", 24 * 60 * 60);
  } catch (error) {
    // Ignore error
  }
};

export const searchArtifactMemory = async (conversationId, query) => {
  try {
    if (!conversationId) return [];
    const key = `artifact-memory-${conversationId}`;
    const cached = await redis.get(key);
    if (!cached) return [];

    const artifacts = JSON.parse(cached);
    if (!query || artifacts.length === 0) return artifacts;

    const docs = artifacts.map((a) => ({
      pageContent: `Title: ${a.title}\nType: ${a.type}\nSummary: ${a.summary}`,
      metadata: a,
    }));

    const store = await vectorStore(docs, `conv-arts-${conversationId}`);
    const results = await store.similaritySearch(query, 3);
    return results.map((r) => r.metadata || r);
  } catch (error) {
    return [];
  }
};

export const getUserPreferences = async (userId) => {
  try {
    if (!userId) return {};
    const key = `user-prefs-${userId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    return {};
  }
};

export const saveUserPreference = async (userId, key, value) => {
  try {
    if (!userId || !key) return;
    const redisKey = `user-prefs-${userId}`;
    const prefs = await getUserPreferences(userId);
    prefs[key] = value;
    await redis.set(redisKey, JSON.stringify(prefs), "EX", 30 * 24 * 60 * 60);
  } catch (error) {
    // Ignore error
  }
};

export const extractAndSaveUserFacts = async (userId, prompt) => {
  if (!userId || !prompt || typeof prompt !== "string" || prompt.trim().length < 4) return;
  const text = prompt.trim();

  try {
    const llm = getModel("intent");
    const extractPrompt = `Extract any permanent factual user profile attributes (name, role/profession, location, tech stack, preferences, company) from this user message.
Output ONLY a valid JSON object with extracted key-values like {"name": "...", "role": "...", "preferredStack": "...", "location": "..."}.
If no personal or profile facts are present, return {}.

User Message: "${text}"

JSON:`;

    const res = await llm.invoke([new HumanMessage(extractPrompt)]);
    const content = (res?.content || "").trim();
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const parsed = JSON.parse(content.substring(firstBrace, lastBrace + 1));
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === "string" && v.trim().length > 0 && !v.toLowerCase().includes("unknown") && !v.toLowerCase().includes("none")) {
          await saveUserPreference(userId, k, v.trim());
        }
      }
    }
  } catch (e) {
    // Ignore error
  }
};

export const getUnifiedMemoryContext = async ({ conversationId, userId, prompt = "" }) => {
  try {
    const [messages, summary, artifacts, userProfile] = await Promise.all([
      getMemory(conversationId),
      getConversationSummary(conversationId),
      searchArtifactMemory(conversationId, prompt),
      getUserPreferences(userId),
    ]);

    let systemContextBlock = "";

    if (userProfile && Object.keys(userProfile).length > 0) {
      const pEntries = Object.entries(userProfile)
        .filter(([k, v]) => typeof v === "string" && v.trim().length > 0)
        .map(([k, v]) => `- ${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)
        .join("\n");
      if (pEntries) {
        systemContextBlock += `\n\n[USER PROFILE & FACTS (Tier 4 Cross-Session)]:\n${pEntries}`;
      }
    }

    if (summary) {
      systemContextBlock += `\n\n[CUMULATIVE CONVERSATION SUMMARY (Tier 2 Long-Term)]:\n${summary}`;
    }

    if (Array.isArray(artifacts) && artifacts.length > 0) {
      const artList = artifacts
        .slice(0, 2)
        .map((a) => `- [${a.type?.toUpperCase() || "ARTIFACT"}] ${a.title}: ${a.summary || ""}`)
        .join("\n");
      if (artList) {
        systemContextBlock += `\n\n[RELEVANT PAST ARTIFACTS (Tier 3 Vector Index)]:\n${artList}`;
      }
    }

    return {
      messages,
      summary,
      artifacts,
      userProfile,
      systemContextBlock,
    };
  } catch (error) {
    return { messages: [], summary: "", artifacts: [], userProfile: {}, systemContextBlock: "" };
  }
};

export default {
  getMemory,
  addMessage,
  getConversationSummary,
  updateConversationSummary,
  getEnrichedMemory,
  saveArtifactMemory,
  searchArtifactMemory,
  getUserPreferences,
  saveUserPreference,
  extractAndSaveUserFacts,
  getUnifiedMemoryContext,
};