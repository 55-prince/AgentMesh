import "dotenv/config";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenRouter } from "@langchain/openrouter";

export const googleLLM = new ChatGoogleGenerativeAI({
  model: "gemini-3.6-flash",
  apiKey: process.env.GOOGLE_API_KEY,
  maxOutputTokens: 8192,
  temperature: 0.2,
});

export const googleLiteLLM = new ChatGoogleGenerativeAI({
  model: "gemini-3.6-flash-lite",
  apiKey: process.env.GOOGLE_API_KEY,
  maxOutputTokens: 4000,
  temperature: 0.2,
});

export const groqLLM = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  maxTokens: 4000,
  temperature: 0.2,
});

export const groqFastLLM = new ChatGroq({
  model: "openai/gpt-oss-20b",
  apiKey: process.env.GROQ_API_KEY,
  maxTokens: 1500,
  temperature: 0.2,
});

export const getDeepseekLLM = () => {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0) {
    try {
      return new ChatOpenRouter({
        model: "deepseek/deepseek-chat",
        apiKey: process.env.OPENROUTER_API_KEY,
        temperature: 0.3,
        maxTokens: 4000,
      });
    } catch (err) {
      console.warn("Could not instantiate OpenRouter LLM, using Google LLM fallback:", err.message);
    }
  }
  return googleLiteLLM;
};

export const getModelName = (model) => {
  if (!model) return "None";
  if (model.model) return model.model;
  if (model.modelName) return model.modelName;
  if (model.model_name) return model.model_name;
  if (model.constructor?.name) return model.constructor.name;
  return "Unknown LLM";
};

export class ResilientChatModel {
  constructor(models = [], agentName = "General") {
    this.models = Array.isArray(models) ? models.filter(Boolean) : [];
    this.agentName = agentName;
  }

  async invoke(input, options = {}) {
    if (this.models.length === 0) {
      throw new Error(`[ResilientChatModel] No models configured for agent "${this.agentName}".`);
    }

    let lastError = null;
    for (let i = 0; i < this.models.length; i++) {
      const model = this.models[i];
      const modelName = getModelName(model);
      const isFallback = i > 0;
      const startTime = Date.now();

      try {
        console.log(
          `🤖 [LLM Call] Agent: "${this.agentName}" | Model: "${modelName}"${isFallback ? ` (Tier ${i + 1} Failover)` : ""}`
        );

        const response = await model.invoke(input, options);
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        const usage = response?.usage_metadata || response?.response_metadata?.tokenUsage || {};
        const inTokens = usage.input_tokens || usage.promptTokens || usage.prompt_tokens || "?";
        const outTokens = usage.output_tokens || usage.completionTokens || usage.completion_tokens || "?";
        const finishReason = response?.response_metadata?.finish_reason || response?.response_metadata?.finishReason || "stop";

        if (finishReason === "MAX_TOKENS" || finishReason === "length") {
          console.warn(
            `⚠️ [TRUNCATION WARNING] Agent "${this.agentName}" hit max tokens limit (${outTokens} tokens)! Finish Reason: ${finishReason}`
          );
        }

        console.log(
          `✅ [LLM Success] Agent: "${this.agentName}" | Model: "${modelName}" (${durationSec}s) | Tokens: in=${inTokens}, out=${outTokens} | Status: ${finishReason}\n`
        );

        return response;
      } catch (err) {
        lastError = err;
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(
          `❌ [LLM Failover] Agent: "${this.agentName}" | Model: "${modelName}" failed in ${durationSec}s: ${err.message}`
        );
      }
    }

    throw new Error(
      `[ResilientChatModel] All ${this.models.length} model tiers exhausted for agent "${this.agentName}". Last error: ${lastError?.message || "Unknown error"}`
    );
  }
}

export const getModel = (agent = "default") => {
  const normAgent = String(agent || "").toLowerCase().trim();

  switch (normAgent) {
    case "coding":
    case "codingagent":
      return new ResilientChatModel([googleLLM, groqLLM], "coding");

    case "pdf":
    case "pdfagent":
      return new ResilientChatModel([googleLLM, groqLLM], "pdf");

    case "ppt":
    case "pptagent":
      return new ResilientChatModel([googleLLM, groqLLM], "ppt");

    case "deepresearch":
    case "deepresearchagent":
      return new ResilientChatModel([googleLLM, groqLLM], "deepResearch");

    case "pdfrag":
    case "pdfragagent":
      return new ResilientChatModel([googleLLM, groqLLM], "pdfRag");

    case "chat":
    case "chatagent":
      return new ResilientChatModel([groqLLM, googleLLM], "chat");

    case "router":
    case "routeragent":
    case "intent":
    case "web":
    case "webagent":
      return new ResilientChatModel([groqFastLLM, googleLiteLLM, groqLLM], normAgent);

    default:
      return new ResilientChatModel([googleLLM, groqLLM], "default");
  }
};
