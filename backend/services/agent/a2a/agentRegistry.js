export const AGENT_REGISTRY = {
  webAgent: {
    id: "webAgent",
    name: "Web Intelligence Agent",
    description: "Performs real-time internet search, live weather, stock market data, and fact retrieval.",
    capabilities: ["search", "live_data", "fact_checking"],
    handler: async (state) => {
      const { webAgent } = await import("../agents/webAgent.js");
      return await webAgent(state);
    },
  },
  imageAgent: {
    id: "imageAgent",
    name: "Creative AI Image Agent",
    description: "Generates high-resolution digital art, concept diagrams, and presentation visual assets.",
    capabilities: ["generate_image", "diagram_asset"],
    handler: async (state) => {
      const { imageAgent } = await import("../agents/imageAgent.js");
      return await imageAgent(state);
    },
  },
  pdfRagAgent: {
    id: "pdfRagAgent",
    name: "Document Intelligence Agent",
    description: "Extracts, summarizes, and answers deep contextual questions from attached PDF documents.",
    capabilities: ["extract_document", "document_qa", "resume_parsing"],
    handler: async (state) => {
      const { pdfRagAgent } = await import("../agents/pdfRagAgent.js");
      return await pdfRagAgent(state);
    },
  },
  codingAgent: {
    id: "codingAgent",
    name: "Full-Stack Software Engineer Agent",
    description: "Generates production code, full-stack web applications, game engines, and scripts.",
    capabilities: ["generate_code", "build_application", "debug_code"],
    handler: async (state) => {
      const { codingAgent } = await import("../agents/codingAgent.js");
      return await codingAgent(state);
    },
  },
  pdfAgent: {
    id: "pdfAgent",
    name: "Publication PDF Document Agent",
    description: "Designs, formats, and publishes styled executive PDF reports and whitepapers.",
    capabilities: ["generate_pdf", "format_report"],
    handler: async (state) => {
      const { pdfAgent } = await import("../agents/pdfAgent.js");
      return await pdfAgent(state);
    },
  },
  pptAgent: {
    id: "pptAgent",
    name: "Presentation Designer Agent",
    description: "Creates structured, slide decks ready for Microsoft PowerPoint & Google Slides.",
    capabilities: ["generate_ppt", "slide_design"],
    handler: async (state) => {
      const { pptAgent } = await import("../agents/pptAgent.js");
      return await pptAgent(state);
    },
  },
  chatAgent: {
    id: "chatAgent",
    name: "Neural Dialogue Agent",
    description: "Conversational synthesis, general reasoning, summarization, and writing.",
    capabilities: ["general_chat", "reasoning"],
    handler: async (state) => {
      const { chatAgent } = await import("../agents/chatAgent.js");
      return await chatAgent(state);
    },
  },
};

export const getAgentCard = (agentName) => {
  return AGENT_REGISTRY[agentName] || null;
};

export const listAgentCapabilities = () => {
  return Object.values(AGENT_REGISTRY).map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities,
  }));
};
