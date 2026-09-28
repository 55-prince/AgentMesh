import { TavilySearch } from "@langchain/tavily";

let _searchTool = null;

const getSearchTool = () => {
  if (_searchTool) return _searchTool;

  if (process.env.TAVILY_API_KEY) {
    try {
      _searchTool = new TavilySearch({
        maxResults: 4,
        topic: "general",
        includeImages: true,
        apiKey: process.env.TAVILY_API_KEY,
      });
      return _searchTool;
    } catch (err) {
      console.warn("Failed to initialize TavilySearch:", err.message);
    }
  }

  _searchTool = {
    invoke: async ({ query }) => {
      console.warn("[AgentMesh] TAVILY_API_KEY not set — web search unavailable.");
      return { results: [], images: [] };
    },
  };
  return _searchTool;
};

export const searchTool = {
  invoke: async (args) => getSearchTool().invoke(args),
};