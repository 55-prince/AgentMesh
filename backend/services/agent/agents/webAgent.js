import { searchTool } from "../config/tavily.js";
import { checkAgentLimit } from "../config/agentLimit.js";

const isTimeQuery = (prompt) =>
  /\b(time|clock|what time|current time|now|date today|today.?s date)\b/i.test(prompt);

const getTimezoneForQuery = (prompt) => {
  const lower = prompt.toLowerCase();
  if (lower.includes("kolkata") || lower.includes("calcutta")) return "Asia/Kolkata";
  if (lower.includes("delhi") || lower.includes("india") || lower.includes("mumbai") || lower.includes("bangalore") || lower.includes("chennai") || lower.includes("ist")) return "Asia/Kolkata";
  if (lower.includes("london") || lower.includes("uk") || lower.includes("gmt")) return "Europe/London";
  if (lower.includes("new york") || lower.includes("nyc") || lower.includes("est")) return "America/New_York";
  if (lower.includes("los angeles") || lower.includes("pst") || lower.includes("la ")) return "America/Los_Angeles";
  if (lower.includes("tokyo") || lower.includes("japan")) return "Asia/Tokyo";
  if (lower.includes("dubai") || lower.includes("uae")) return "Asia/Dubai";
  if (lower.includes("sydney") || lower.includes("australia")) return "Australia/Sydney";
  if (lower.includes("paris") || lower.includes("france")) return "Europe/Paris";
  if (lower.includes("beijing") || lower.includes("china") || lower.includes("shanghai")) return "Asia/Shanghai";
  return "Asia/Kolkata";
};

const getLiveTime = async (timezone) => {
  try {
    const localTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: timezone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date());

    return {
      title: `Live Current Time — ${timezone.replace(/_/g, " ")}`,
      content: `The current live date and time in ${timezone.replace(/_/g, " ")} is: ${localTime}.`,
      url: `https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(timezone)}`,
    };
  } catch (err) {
    return {
      title: "Live Current Time",
      content: `Current UTC time: ${new Date().toUTCString()}`,
      url: "https://timeapi.io",
    };
  }
};

const isValidPhotoUrl = (url) => {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  const lower = url.toLowerCase();
  if (
    lower.includes(".svg") ||
    lower.includes("favicon") ||
    lower.includes("pixel") ||
    lower.includes("1x1") ||
    lower.includes("logo") ||
    lower.includes("badge") ||
    lower.includes("edubilla")
  ) {
    return false;
  }
  return true;
};

export const webAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "webAgent");
    const results = [];
    const images = [];

    if (isTimeQuery(state.prompt)) {
      const timezone = getTimezoneForQuery(state.prompt);
      results.push(await getLiveTime(timezone));
    }

    try {
      const tavilyResult = await searchTool.invoke({ query: state.prompt });

      if (tavilyResult?.results?.length) {
        results.push(...tavilyResult.results);
        tavilyResult.results.forEach((r) => {
          if (Array.isArray(r.images)) {
            images.push(...r.images);
          }
        });
      }

      if (Array.isArray(tavilyResult?.images)) {
        images.push(...tavilyResult.images);
      }
    } catch (searchErr) {
      console.warn("[webAgent] Search provider error:", searchErr.message);
    }

    const uniqueImages = Array.from(new Set(images.filter(isValidPhotoUrl))).slice(0, 4);
    const topResults = results.slice(0, 5);

    return {
      ...state,
      searchResults: { results: topResults, images: uniqueImages },
      images: uniqueImages,
    };
  } catch (error) {
    console.error(`Error in webAgent: ${error.message}`);
    return {
      ...state,
      searchResults: { results: [], images: [] },
      images: [],
    };
  }
};

export default webAgent;