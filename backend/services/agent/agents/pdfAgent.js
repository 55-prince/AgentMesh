import "dotenv/config";
import { getModel } from "../config/llmModels.js";
import { generatePdfBuffer } from "../utils/generatePdf.js";
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

export const pdfAgent = async (state) => {
  try {
    await checkAgentLimit(state.userId, "pdfAgent");
    const llm = getModel("pdfAgent");

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
            (a) => a.type === "pdf" || a.language === "pdf" || a.fileName?.endsWith(".pdf") || a.title
          );
          if (prevArt) {
            const prevTitle = (prevArt.title || "").replace(/\.pdf$/i, "").replace(/^PDF:\s*/i, "").trim();
            if (prevTitle) {
              previousContextNotes = `PREVIOUS DOCUMENT CONTEXT: Title: "${prevTitle}" | Summary: "${prevArt.summary || ""}"\n`;
              effectiveTopic = prevTitle;
              isFollowUp = true;
              break;
            }
          }
        }
        if (m.role === "user" && m.content && m.content !== state.prompt) {
          const cleaned = m.content
            .replace(/^(can\s+u|please|create|generate|make)\s+(a\s+)?(pdf|ppt|presentation|document)\s+(on|about|for)?/i, "")
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
          ? `${effectiveTopic} official overview schedule facts`
          : effectiveTopic;

        const webData = await delegateResearch("pdfAgent", searchQuery, state, state._a2aMeta?.depth || 0);
        if (webData?.searchResults?.results?.length) {
          const facts = webData.searchResults.results
            .slice(0, 5)
            .map((r) => `- ${r.title}: ${r.snippet || r.content}`)
            .join("\n");
          liveResearchContext = `\nREAL-TIME RESEARCH DATA (from webAgent via A2A):\n${facts}\n`;
        }

        if (webData?.searchResults?.images?.length) {
          const validImgs = webData.searchResults.images
            .map((img) => (typeof img === "string" ? img : img.url || img.src || ""))
            .filter((url) => url && url.startsWith("http"));
          collectedImages.push(...validImgs);
        }
      } catch (a2aErr) {
        console.warn("[pdfAgent] Research delegation skipped:", a2aErr.message);
      }
    }

    collectedImages = Array.from(new Set(collectedImages));

    if (isImageRequested && collectedImages.length === 0) {
      try {
        const visualResult = await delegateVisual("pdfAgent", `High quality professional portrait or illustration of ${effectiveTopic}`, state, 0);
        if (visualResult?.images?.length) {
          collectedImages.push(...visualResult.images);
        }
      } catch (a2aVisualErr) {
        console.warn("[pdfAgent] Visual generation skipped:", a2aVisualErr.message);
      }
    }

    const prompt = `You are an elite Document Architect and PDF Generation Agent.
Given the user's request, create a professional, publication-quality document structure in strict JSON format.
${previousContextNotes}${systemContextBlock}${liveResearchContext}
Core Subject/Topic: "${effectiveTopic}"
User Modification / Direct Prompt: "${state.prompt}"

Return ONLY valid JSON with this structure:
{
  "title": "Main Document Title",
  "author": "AgentMesh AI",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Comprehensive, rich, multi-sentence analytical paragraph explaining this topic thoroughly with concrete facts and statistics.",
      "bullets": [
        "Key takeaway or high-value bullet point 1",
        "Key takeaway or high-value bullet point 2"
      ],
      "table": {
        "headers": ["Parameter", "Detail", "Impact"],
        "rows": [
          ["Key Feature", "Production-grade spec", "High efficiency"],
          ["Metrics", "Verified performance benchmark", "Optimal stability"]
        ]
      }
    }
  ]
}

RULES:
- Provide 4 to 6 detailed, informative sections.
- Tables are optional: include a table only where structured comparative or metric data adds value.
- Output ONLY the JSON object. Zero conversational filler.`;

    const res = await llm.invoke(prompt);
    let rawText = typeof res?.content === "string" ? res.content : JSON.stringify(res?.content);
    rawText = cleanJsonString(rawText);

    let docData;
    try {
      docData = JSON.parse(rawText);
    } catch (parseErr) {
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        docData = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      } else {
        throw new Error("Could not parse JSON document structure from model response.");
      }
    }

    const pdfBuffer = await generatePdfBuffer(docData, collectedImages);
    const fileName = `${docData.title ? docData.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 40) : "Document"}_${Date.now()}.pdf`;

    let fileUrl = null;
    let base64Fallback = null;

    try {
      fileUrl = await uploadToS3(pdfBuffer, fileName, "application/pdf");
      if (fileUrl) {
        fileUrl = await getFromS3(fileName);
      }
    } catch (s3Err) {
      console.warn("[pdfAgent] S3 upload error, falling back to base64:", s3Err.message);
    }

    if (!fileUrl) {
      base64Fallback = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
      fileUrl = base64Fallback;
    }

    const artifact = {
      type: "pdf",
      title: docData.title || "Generated Document",
      url: fileUrl,
      fileName: fileName,
      fileSize: `${(pdfBuffer.length / 1024).toFixed(1)} KB`,
      summary: docData.sections?.map((s) => s.heading).join(" • ") || "Comprehensive PDF Document",
    };

    const firstImageMd = collectedImages.length > 0 ? `\n\n![Visual Asset](${collectedImages[0]})` : "";

    const previewSummary = (docData.sections || [])
      .map((s, i) => `${i + 1}. **${s.heading}**\n   ${(s.content || "").substring(0, 150)}...`)
      .join("\n\n");

    const aiResponse = `### 📄 ${docData.title || "Generated Document"}
${docData.author ? `*Author: ${docData.author}*` : ""}${firstImageMd}

**Document Outline & Key Sections:**
${previewSummary}

---
📥 **Download Options:**
- [Click to Open & Download PDF](${fileUrl})`;

    return {
      ...state,
      aiResponse,
      images: collectedImages,
      artifacts: [artifact],
    };
  } catch (error) {
    console.error("Error in pdfAgent:", error?.message || error);
    return {
      ...state,
      aiResponse: error?.data?.message || error?.message || "⚠️ An error occurred while generating the PDF document.",
      artifacts: [],
    };
  }
};

export default pdfAgent;