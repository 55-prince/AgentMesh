import { AGENT_REGISTRY } from "./agentRegistry.js";

export const invokeA2A = async ({
  fromAgent = "unknown",
  toAgent,
  action = "execute",
  prompt = "",
  state = {},
  depth = 0,
}) => {
  if (depth > 2) {
    console.warn(`⚠️ [A2A Loop Prevention] Max delegation depth reached from "${fromAgent}" to "${toAgent}".`);
    return {
      success: false,
      error: "Max A2A delegation depth reached.",
      aiResponse: "",
    };
  }

  const target = AGENT_REGISTRY[toAgent];
  if (!target) {
    console.warn(`⚠️ [A2A Dispatch Error] Target agent "${toAgent}" not registered.`);
    return {
      success: false,
      error: `Agent ${toAgent} not found in registry.`,
    };
  }

  const messageId = `a2a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const summaryPrompt = (prompt || state.prompt || "").slice(0, 70);

  console.log(
    `📡 [A2A Dispatch] (Depth ${depth}) [${fromAgent}] ➔ [${toAgent}] | Action: "${action}" | Task: "${summaryPrompt}..."`
  );

  const subState = {
    ...state,
    prompt: prompt || state.prompt,
    agent: toAgent,
    _a2aMeta: {
      messageId,
      fromAgent,
      toAgent,
      depth: depth + 1,
      action,
    },
  };

  try {
    const result = await target.handler(subState);
    console.log(`✅ [A2A Complete] [${fromAgent}] ➔ [${toAgent}] succeeded.`);
    return {
      success: true,
      fromAgent,
      toAgent,
      messageId,
      ...result,
    };
  } catch (err) {
    console.error(`❌ [A2A Error] Failed delegating from "${fromAgent}" to "${toAgent}":`, err.message);
    return {
      success: false,
      fromAgent,
      toAgent,
      error: err.message,
    };
  }
};

export const delegateResearch = async (fromAgent, query, state = {}, depth = 0) => {
  return await invokeA2A({
    fromAgent,
    toAgent: "webAgent",
    action: "live_search",
    prompt: query,
    state,
    depth,
  });
};

export const delegateVisual = async (fromAgent, imagePrompt, state = {}, depth = 0) => {
  return await invokeA2A({
    fromAgent,
    toAgent: "imageAgent",
    action: "generate_image",
    prompt: imagePrompt,
    state,
    depth,
  });
};

export const delegateCoding = async (fromAgent, codePrompt, state = {}, depth = 0) => {
  return await invokeA2A({
    fromAgent,
    toAgent: "codingAgent",
    action: "generate_code",
    prompt: codePrompt,
    state,
    depth,
  });
};

export const delegateDocumentQA = async (fromAgent, question, state = {}, depth = 0) => {
  return await invokeA2A({
    fromAgent,
    toAgent: "pdfRagAgent",
    action: "document_qa",
    prompt: question,
    state,
    depth,
  });
};

export default {
  invokeA2A,
  delegateResearch,
  delegateVisual,
  delegateCoding,
  delegateDocumentQA,
};
