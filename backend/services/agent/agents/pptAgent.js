import { getModel } from "../config/llmModels.js";
import { pptBuffer } from "../utils/generatePpt.js";
import { uploadToS3 } from "../utils/uploadToS3.js";
import { getFromS3 } from "../utils/getFromS3.js";
import { checkAgentLimit } from "../config/agentLimit.js";
import { delegateResearch, delegateVisual } from "../a2a/a2aBus.js";
import { getUnifiedMemoryContext, extractAndSaveUserFacts } from "../config/memory.js";

const cleanJsonString = (raw) => {
  if (!raw) return "";
  let text = String(raw).trim();
  if (text.startsWith("```json")) text = text.substring(7);
  else if (text.startsWith("```")) text = text.substring(3);
  if (text.endsWith("```")) text = text.substring(0, text.length - 3);
  return text.trim();
};

export const pptAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "pptAgent");
    const llm = getModel("coding");

    if (state.userId && state.prompt) {
      extractAndSaveUserFacts(state.userId, state.prompt).catch(() => {});
    }

    const promptLower = (state.prompt || "").toLowerCase();

    let effectiveTopic = state.prompt;
    let previousContextNotes = "";
    let isFollowUp = false;

    const { messages: memory, systemContextBlock } = await getUnifiedMemoryContext({
      conversationId: state.conversationId,
      userId: state.userId,
      prompt: state.prompt,
    });

    if (Array.isArray(memory) && memory.length > 0) {
      for (let i = memory.length - 1; i >= 0; i--) {
        const m = memory[i];
        if (m.role === "assistant" && Array.isArray(m.artifacts) && m.artifacts.length > 0) {
          const prevArt = m.artifacts.find(
            (a) => a.type === "ppt" || a.type === "pptx" || a.language === "ppt" || a.fileName?.endsWith(".pptx") || a.title
          );
          if (prevArt) {
            const prevTitle = (prevArt.title || "").replace(/\.pptx$/i, "").replace(/^PPT:\s*/i, "").trim();
            if (prevTitle) {
              previousContextNotes = `PREVIOUS PRESENTATION CONTEXT: Title: "${prevTitle}" | Slides: ${prevArt.slides?.length || 4}\n`;
              effectiveTopic = prevTitle;
              isFollowUp = true;
              break;
            }
          }
        }
        if (m.role === "user" && m.content && m.content !== state.prompt) {
          const cleaned = m.content
            .replace(/^(can\s+u|please|create|generate|make)\s+(a\s+)?(ppt|presentation|slides|deck|pdf)\s+(on|about|for)?/i, "")
            .replace(/topic\s+/i, "")
            .trim();
          if (cleaned.length > 2 && !cleaned.toLowerCase().startsWith("can u add")) {
            effectiveTopic = cleaned;
            isFollowUp = true;
            break;
          }
        }
      }
    }

    let liveResearchContext = "";
    let collectedImages = [];

    if (Array.isArray(state.images) && state.images.length > 0) {
      const directImgs = state.images
        .map((img) => (typeof img === "string" ? img : img.url || img.src || ""))
        .filter((url) => url && url.startsWith("http"));
      collectedImages.push(...directImgs);
    }

    const isLiveSearchNeeded =
      promptLower.includes("upcoming") ||
      promptLower.includes("next") ||
      promptLower.includes("schedule") ||
      promptLower.includes("fixture") ||
      promptLower.includes("game") ||
      promptLower.includes("match") ||
      promptLower.includes("live") ||
      promptLower.includes("date") ||
      promptLower.includes("today") ||
      promptLower.includes("2025") ||
      promptLower.includes("2026") ||
      promptLower.includes("news") ||
      promptLower.includes("score") ||
      promptLower.includes("price") ||
      promptLower.includes("stock") ||
      promptLower.includes("rate") ||
      promptLower.includes("weather");

    const isImageRequested =
      promptLower.includes("picture") ||
      promptLower.includes("image") ||
      promptLower.includes("photo") ||
      promptLower.includes("with pics") ||
      promptLower.includes("add pics") ||
      promptLower.includes("visual") ||
      promptLower.includes("illustration");

    if (isLiveSearchNeeded && !state._a2aMeta) {
      try {
        const searchQuery = isFollowUp
          ? `${effectiveTopic} official schedule fixtures facts`
          : effectiveTopic;

        const webData = await delegateResearch("pptAgent", searchQuery, state, state._a2aMeta?.depth || 0);
        if (webData?.searchResults?.results?.length) {
          const facts = webData.searchResults.results.slice(0, 4).map((r) => `- ${r.title}: ${r.snippet || r.content}`).join("\n");
          liveResearchContext = `\nREAL-TIME RESEARCH FACTS (from webAgent via A2A):\n${facts}\n`;
        }

        if (webData?.searchResults?.images?.length) {
          const validImgs = webData.searchResults.images
            .map((img) => (typeof img === "string" ? img : img.url || img.src || ""))
            .filter((url) => url && url.startsWith("http"));
          collectedImages.push(...validImgs);
        }
      } catch (a2aErr) {
        console.warn("[pptAgent] Research delegation skipped:", a2aErr.message);
      }
    }

    collectedImages = Array.from(new Set(collectedImages));

    if (isImageRequested && collectedImages.length === 0) {
      try {
        const visualResult = await delegateVisual("pptAgent", `Presentation slide illustration for ${effectiveTopic}`, state, 0);
        if (visualResult?.images?.length) {
          collectedImages.push(...visualResult.images);
        }
      } catch (a2aVisualErr) {
        console.warn("[pptAgent] Visual generation skipped:", a2aVisualErr.message);
      }
    }

    const prompt = `You are an elite presentation designer and PowerPoint architect.
Create a structured slide deck in valid JSON based on the user's topic.
${previousContextNotes}${systemContextBlock}${liveResearchContext}
Core Subject/Topic: "${effectiveTopic}"
User Request / Modification: "${state.prompt}"

Return ONLY valid JSON with this structure:
{
  "title": "Main Presentation Title",
  "subtitle": "Informative Deck Subtitle",
  "author": "AgentMesh AI",
  "theme": "modern-dark",
  "slides": [
    {
      "title": "1. Section / Slide Heading",
      "points": [
        "Comprehensive, high-value presentation bullet point 1",
        "Comprehensive, high-value presentation bullet point 2",
        "Comprehensive, high-value presentation bullet point 3"
      ]
    },
    {
      "title": "2. Section / Slide Heading",
      "points": [
        "Insightful strategic point 1",
        "Insightful strategic point 2",
        "Insightful strategic point 3"
      ]
    },
    {
      "title": "3. Section / Slide Heading",
      "points": [
        "Detailed analytical breakdown point 1",
        "Detailed analytical breakdown point 2",
        "Detailed analytical breakdown point 3"
      ]
    },
    {
      "title": "4. Section / Slide Heading",
      "points": [
        "Forward-looking conclusion and key takeaway 1",
        "Forward-looking conclusion and key takeaway 2"
      ]
    }
  ]
}

RULES:
- Provide 4 to 8 slides depending on depth.
- Each slide MUST have 2 to 4 rich, informative points.
- Output ONLY the JSON object. Zero conversational filler.`;

    const res = await llm.invoke(prompt);
    let rawText = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content);
    rawText = cleanJsonString(rawText);

    let deckData;
    try {
      deckData = JSON.parse(rawText);
    } catch (parseErr) {
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        deckData = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } else {
        throw new Error("Could not parse JSON structure from PowerPoint model response.");
      }
    }

    const pptxBuffer = await pptBuffer(deckData, collectedImages);
    const fileName = `${deckData.title ? deckData.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40) : "Presentation"}_${Date.now()}.pptx`;

    let fileUrl = null;
    let base64Fallback = null;

    try {
      fileUrl = await uploadToS3(pptxBuffer, fileName, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      if (fileUrl) {
        fileUrl = await getFromS3(fileName);
      }
    } catch (s3Err) {
      console.warn("[pptAgent] S3 upload error, falling back to base64:", s3Err.message);
    }

    if (!fileUrl) {
      base64Fallback = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${pptxBuffer.toString("base64")}`;
      fileUrl = base64Fallback;
    }

    const artifact = {
      type: "ppt",
      title: deckData.title || "Generated Presentation",
      url: fileUrl,
      fileName: fileName,
      fileSize: `${(pptxBuffer.length / 1024).toFixed(1)} KB`,
      slides: deckData.slides || [],
      summary: deckData.slides?.map((s) => s.title).join(" • ") || "Comprehensive PowerPoint Deck",
    };

    const firstImageMd = collectedImages.length > 0 ? `\n\n![Visual Asset](${collectedImages[0]})` : "";

    const slideList = (deckData.slides || [])
      .map((s, i) => `**Slide ${i + 1}: ${s.title}**\n${(s.points || []).map((p) => `- ${p}`).join("\n")}`)
      .join("\n\n");

    const aiResponse = `### 📊 ${deckData.title || "Generated Presentation"}
${deckData.subtitle ? `*${deckData.subtitle}*` : ""}${firstImageMd}

**Slide Deck Overview (${deckData.slides?.length || 0} Slides):**

${slideList}

---
📥 **Download Options:**
- [Click to Open & Download PowerPoint Presentation (.pptx)](${fileUrl})`;

    return {
      ...state,
      aiResponse,
      images: collectedImages,
      artifacts: [artifact],
    };
  } catch (error) {
    console.error("Error in pptAgent:", error?.message || error);
    return {
      ...state,
      aiResponse: error?.data?.message || error?.message || "⚠️ An error occurred while generating the presentation.",
      artifacts: [],
    };
  }
};

export default pptAgent;