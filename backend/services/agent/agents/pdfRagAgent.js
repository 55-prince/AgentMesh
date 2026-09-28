import "dotenv/config";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { vectorStore } from "../config/vectorDb.js";
import { getModel } from "../config/llmModels.js";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { getMemory } from "../config/memory.js";
import redis from "../../../shared/redis.js";
import { checkAgentLimit } from "../config/agentLimit.js";

export const extractTextFromPdfBuffer = async (buffer) => {
    try {
        if (!buffer || buffer.length === 0) return "";
        const parser = new PDFParse({ data: buffer });
        await parser.load();
        const result = await parser.getText();
        if (result && typeof result === "object") {
            return result.text || "";
        }
        return String(result || "").trim();
    } catch (err) {
        console.error("PDFParse extraction error in pdfRagAgent:", err.message);
        return "";
    }
};

export const pdfRagAgent = async (state) => {
    let tempFilePath = state?.file?.path || null;

    try {
        const conversationId = state.conversationId;
        const userId = state.userId;
        checkAgentLimit(state.userId, "pdfRagAgent");
        const redisKey = conversationId
            ? (userId ? `pdf-context-${userId}-${conversationId}` : `pdf-context-${conversationId}`)
            : null;
        let documentText = "";
        let documentName = "Attached Document";

        if (state.file && state.file.path && fs.existsSync(state.file.path)) {
            const buffer = fs.readFileSync(state.file.path);
            documentText = await extractTextFromPdfBuffer(buffer);
            documentName = state.file.originalname || "Uploaded Document.pdf";
        }

        if (!documentText && state.pdfAttachment) {
            const { base64, dataUri, name } = state.pdfAttachment;
            documentName = name || "Attached Document.pdf";
            let rawBase64 = base64 || dataUri || "";
            if (rawBase64.includes(",")) {
                rawBase64 = rawBase64.split(",")[1];
            }
            if (rawBase64) {
                const buffer = Buffer.from(rawBase64, "base64");
                documentText = await extractTextFromPdfBuffer(buffer);
            }
        }

        if (documentText && redisKey) {
            await redis.set(
                redisKey,
                JSON.stringify({
                    name: documentName,
                    text: documentText,
                    timestamp: Date.now(),
                }),
                "EX",
                24 * 60 * 60
            );
        }

        if (!documentText && redisKey) {
            const cached = await redis.get(redisKey);
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    documentText = parsed.text || "";
                    documentName = parsed.name || "Attached Document.pdf";
                } catch (e) {
                    // Ignore parse error
                }
            }
        }

        if (!documentText || documentText.trim().length === 0) {
            return {
                ...state,
                aiResponse: `⚠️ **PDF RAG Notice**: No document text could be extracted or found. Please attach a PDF document with selectable text and retry.`,
                artifacts: [],
            };
        }

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 750,
            chunkOverlap: 150,
        });
        const docs = await splitter.createDocuments([documentText]);
        const store = await vectorStore(docs, `pdf-${Date.now()}`);
        const relevantDocs = await store.similaritySearch(state.prompt || "summary", 3);
        const retrievedChunks = relevantDocs.map((d) => d.pageContent).join("\n\n---\n\n");

        const llm = getModel("pdfRagAgent");

        const systemPrompt = `You are the AgentMesh Document QA Agent.
Rules:
1. Answer directly and concisely based ONLY on the provided PDF context.
2. Highlight exact requested attributes (names, grades, metrics, CPI, dates) with bold keys and bullet points.
3. If not found in the context, reply: "I couldn't find this information in the uploaded PDF."
4. Use clean Markdown without conversational filler.`;

        const history = conversationId ? await getMemory(conversationId) : [];
        const messages = [new SystemMessage(systemPrompt)];

        if (Array.isArray(history) && history.length > 0) {
            const recentHistory = history.slice(-2);
            recentHistory.forEach((msg) => {
                if (!msg || !msg.content) return;
                const cleanContent = String(msg.content).slice(0, 250);
                if (msg.role === "user") {
                    messages.push(new HumanMessage(cleanContent));
                } else if (msg.role === "assistant") {
                    messages.push(new AIMessage(cleanContent));
                }
            });
        }

        const userPromptText = `Document: ${documentName}

Relevant Sections:
${retrievedChunks}

Document Context:
${documentText.slice(0, 3500)}

Question: ${state.prompt || "Summarize the key information."}`;

        messages.push(new HumanMessage(userPromptText));

        const promptLower = (state.prompt || "").toLowerCase();
        if (
            promptLower.includes("build website") ||
            promptLower.includes("build portfolio") ||
            promptLower.includes("portfolio site") ||
            promptLower.includes("write code") ||
            promptLower.includes("create app") ||
            promptLower.includes("python script")
        ) {
            try {
                const { delegateCoding } = await import("../a2a/a2aBus.js");
                const codePrompt = `${state.prompt}\n\nDocument Data:\n${documentText.slice(0, 3000)}`;
                const codeResult = await delegateCoding("pdfRagAgent", codePrompt, state, state._a2aMeta?.depth || 0);
                if (codeResult && codeResult.artifacts?.length) {
                    return {
                        ...state,
                        aiResponse: codeResult.aiResponse,
                        artifacts: codeResult.artifacts,
                    };
                }
            } catch (a2aCodeErr) {
                console.warn("[pdfRagAgent] A2A Coding delegation skipped:", a2aCodeErr.message);
            }
        }

        const res = await llm.invoke(messages);
        const aiResponse = res?.content || "No response generated.";

        const artifactItem = {
            id: Date.now(),
            type: "document",
            title: `${documentName} — Analysis`,
            fileName: documentName,
            language: "markdown",
            summary: `RAG intelligence extraction for ${documentName}`,
            content: `# 📄 Analysis: ${documentName}\n\n${aiResponse}`,
        };

        return {
            ...state,
            aiResponse,
            artifacts: [artifactItem],
        };
    } catch (error) {
        console.error(`Error in pdfRagAgent: ${error.message}`);
        return {
            ...state,
            aiResponse: `⚠️ **PDF RAG Agent Error**: Failed to process PDF (${error.message || "Unknown error"}).`,
            artifacts: [],
        };
    } finally {
        try {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupErr) {
            // Ignore
        }
    }
};

export default pdfRagAgent;