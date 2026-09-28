import { getModel } from "../config/llmModels.js";
import redis from "../../../shared/redis.js";
import { appendThought, appendTraceNode } from "../utils/tracer.js";

export const routerAgent = async (state) => {
  let thoughtSteps = Array.isArray(state.thoughtSteps) ? [...state.thoughtSteps] : [];
  let executionTrace = Array.isArray(state.executionTrace) ? [...state.executionTrace] : [];

  if (state.isDeepResearch || state.agent === "deepResearchAgent" || state.agent === "deepResearch") {
    thoughtSteps = appendThought(
      { thoughtSteps },
      "Deep Research Mode Activated",
      "Initializing autonomous multi-vector planner and parallel research workers.",
      "research",
      60
    );
    return {
      ...state,
      agent: "deepResearchAgent",
      thoughtSteps,
      executionTrace,
    };
  }

  if (
    state.file?.mimetype === "application/pdf" ||
    state.file?.originalname?.toLowerCase().endsWith(".pdf") ||
    state.pdfAttachment
  ) {
    thoughtSteps = appendThought(
      { thoughtSteps },
      "PDF Document Detected",
      `Targeting pdfRagAgent for document extraction: ${state.pdfAttachment?.name || state.file?.originalname || "PDF"}`,
      "rag",
      40
    );
    return {
      ...state,
      agent: "pdfRagAgent",
      thoughtSteps,
      executionTrace,
    };
  }

  if (state.agent && state.agent !== "auto") {
    const finalAgent =
      state.agent === "pdfRag" || state.agent === "pdfRagAgent" ? "pdfRagAgent" : state.agent;
    thoughtSteps = appendThought(
      { thoughtSteps },
      `Explicit Agent Selected: ${finalAgent}`,
      `Routing directly to ${finalAgent}`,
      "router",
      30
    );
    return {
      ...state,
      agent: finalAgent,
      thoughtSteps,
      executionTrace,
    };
  }

  const promptLower = (state.prompt || "").toLowerCase().trim();

  if (
    promptLower.startsWith("deep research") ||
    promptLower.includes("deep dive research") ||
    promptLower.includes("exhaustive research on")
  ) {
    thoughtSteps = appendThought(
      { thoughtSteps },
      "Deep Research Intent Recognized",
      "Spawning multi-agent research planner.",
      "research",
      50
    );
    return {
      ...state,
      agent: "deepResearchAgent",
      thoughtSteps,
      executionTrace,
    };
  }

  if (state.conversationId) {
    try {
      const userScopedKey = state.userId ? `pdf-context-${state.userId}-${state.conversationId}` : null;
      const cachedPdf = (userScopedKey ? await redis.get(userScopedKey) : null) || await redis.get(`pdf-context-${state.conversationId}`);
      if (cachedPdf) {
        if (
          promptLower.includes("cpi") ||
          promptLower.includes("cgpa") ||
          promptLower.includes("student") ||
          promptLower.includes("resume") ||
          promptLower.includes("document") ||
          promptLower.includes("this pdf") ||
          promptLower.includes("in the pdf") ||
          promptLower.includes("what is") ||
          promptLower.includes("who is") ||
          promptLower.includes("degree") ||
          promptLower.includes("college") ||
          promptLower.includes("university") ||
          promptLower.includes("summarize") ||
          promptLower.includes("extract") ||
          promptLower.includes("skills") ||
          promptLower.includes("experience")
        ) {
          return { ...state, agent: "pdfRagAgent" };
        }
      }
    } catch (err) {
      console.warn("Error checking cached PDF context in routerAgent:", err.message);
    }
  }

  if (
    promptLower.includes("analyze pdf") ||
    promptLower.includes("query pdf") ||
    promptLower.includes("read pdf") ||
    promptLower.includes("attached pdf") ||
    promptLower.includes("uploaded pdf") ||
    promptLower.includes("in this pdf") ||
    promptLower.includes("from this pdf") ||
    promptLower.includes("in this resume")
  ) {
    return { ...state, agent: "pdfRagAgent" };
  }

  if (
    promptLower.includes("ppt") ||
    promptLower.includes("powerpoint") ||
    promptLower.includes("presentation") ||
    promptLower.includes("slide deck") ||
    promptLower.includes("slides")
  ) {
    return { ...state, agent: "pptAgent" };
  }

  if (
    promptLower.includes("generate pdf") ||
    promptLower.includes("create pdf") ||
    promptLower.includes("make pdf") ||
    promptLower.includes("build pdf") ||
    promptLower.includes("download pdf") ||
    promptLower.startsWith("pdf on ") ||
    promptLower.includes("pdf on ") ||
    promptLower.includes("report on ")
  ) {
    return { ...state, agent: "pdfAgent" };
  }

  if (
    promptLower.startsWith("draw ") ||
    promptLower.startsWith("generate image") ||
    promptLower.startsWith("create image") ||
    promptLower.includes("image of") ||
    promptLower.includes("picture of")
  ) {
    return { ...state, agent: "imageAgent" };
  }

  if (
    promptLower.includes("code") ||
    promptLower.includes("program") ||
    promptLower.includes("game") ||
    promptLower.includes("app") ||
    promptLower.includes("html") ||
    promptLower.includes("javascript") ||
    promptLower.includes("python") ||
    promptLower.includes("c++") ||
    promptLower.includes("java") ||
    promptLower.includes("script") ||
    promptLower.includes("function") ||
    promptLower.includes("css") ||
    promptLower.includes("bug")
  ) {
    return { ...state, agent: "codingAgent" };
  }

  if (
    promptLower.includes("search") ||
    promptLower.includes("latest") ||
    promptLower.includes("news") ||
    promptLower.includes("weather") ||
    promptLower.includes("stock price")
  ) {
    return { ...state, agent: "webAgent" };
  }

  const llm = getModel("routerAgent");

  const prompt = `You are a strict routing classifier for an AI agent system.
Analyze the user request and return ONLY ONE agent name from this list:
- pdfRagAgent (querying, analyzing, extracting from uploaded or attached PDF documents/resumes)
- pptAgent (presentations, PowerPoint, slide decks)
- pdfAgent (generating new formatted publication PDF documents, executive reports, whitepapers)
- codingAgent (code generation, debugging, full-stack web apps, scripts)
- imageAgent (AI image creation, digital art)
- webAgent (real-time internet search, live news, weather, web lookup)
- chatAgent (general conversation, writing, brainstorming)

User Request: "${state.prompt}"

Return ONLY the single word agent name (e.g. pdfRagAgent):`;

  try {
    const response = await llm.invoke(prompt);
    const raw = (typeof response?.content === "string" ? response.content : "").trim().toLowerCase();

    let finalAgent = "chatAgent";
    if (raw.includes("pdfrag") || raw.includes("rag")) finalAgent = "pdfRagAgent";
    else if (raw.includes("ppt")) finalAgent = "pptAgent";
    else if (raw.includes("pdf")) finalAgent = "pdfAgent";
    else if (raw.includes("coding") || raw.includes("code")) finalAgent = "codingAgent";
    else if (raw.includes("image")) finalAgent = "imageAgent";
    else if (raw.includes("web")) finalAgent = "webAgent";
    else if (raw.includes("chat")) finalAgent = "chatAgent";

    return {
      ...state,
      agent: finalAgent,
    };
  } catch (error) {
    console.error("Error in routerAgent LLM classification:", error.message);
    return {
      ...state,
      agent: "chatAgent",
    };
  }
};

export default routerAgent;