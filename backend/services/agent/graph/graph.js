import { StateGraph } from "@langchain/langgraph";
import { agentState } from "./state.js";
import { pptAgent } from "../agents/pptAgent.js";
import { chatAgent } from "../agents/chatAgent.js";
import { imageAgent } from "../agents/imageAgent.js";
import { pdfAgent } from "../agents/pdfAgent.js";
import { pdfRagAgent } from "../agents/pdfRagAgent.js";
import { webAgent } from "../agents/webAgent.js";
import { routerAgent } from "./routerAgent.js";
import { codingAgent } from "../agents/codingAgent.js";
import { deepResearchAgent } from "../agents/deepResearchAgent.js";

const workflow = new StateGraph(agentState);

workflow.addNode("routerAgent", routerAgent);
workflow.addNode("chatAgent", chatAgent);
workflow.addNode("pptAgent", pptAgent);
workflow.addNode("imageAgent", imageAgent);
workflow.addNode("pdfAgent", pdfAgent);
workflow.addNode("pdfRagAgent", pdfRagAgent);
workflow.addNode("webAgent", webAgent);
workflow.addNode("codingAgent", codingAgent);
workflow.addNode("deepResearchAgent", deepResearchAgent);

workflow.addEdge("__start__", "routerAgent");

workflow.addConditionalEdges(
  "routerAgent",
  (state) => {
    switch (state.agent) {
      case "chatAgent":
        return "chatAgent";
      case "pdfRagAgent":
      case "pdfRag":
        return "pdfRagAgent";
      case "pdfAgent":
        return "pdfAgent";
      case "imageAgent":
        return "imageAgent";
      case "pptAgent":
        return "pptAgent";
      case "webAgent":
        return "webAgent";
      case "codingAgent":
        return "codingAgent";
      case "deepResearchAgent":
      case "deepResearch":
        return "deepResearchAgent";
      default:
        return "chatAgent";
    }
  },
  {
    chatAgent: "chatAgent",
    pdfRagAgent: "pdfRagAgent",
    pdfAgent: "pdfAgent",
    webAgent: "webAgent",
    pptAgent: "pptAgent",
    imageAgent: "imageAgent",
    codingAgent: "codingAgent",
    deepResearchAgent: "deepResearchAgent",
  }
);

workflow.addEdge("webAgent", "chatAgent");
workflow.addEdge("pdfRagAgent", "__end__");
workflow.addEdge("pdfAgent", "__end__");
workflow.addEdge("pptAgent", "__end__");
workflow.addEdge("imageAgent", "__end__");
workflow.addEdge("chatAgent", "__end__");
workflow.addEdge("codingAgent", "__end__");
workflow.addEdge("deepResearchAgent", "__end__");

export const graph = workflow.compile();