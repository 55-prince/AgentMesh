import axios from "axios";
import { graph } from "../graph/graph.js";
import { addMessage, extractAndSaveUserFacts } from "../config/memory.js";

export const chatAgentController = async (req, res) => {
    try {
        const { conversationId, prompt, agent, pdfAttachment, userId: bodyUserId, isDeepResearch } = req.body;
        const file = req.file || null;
        const userId = req.headers["x-user-id"] || bodyUserId || null;
        const chatUrl = process.env.CHAT_PATH;

        if (userId && prompt) {
            extractAndSaveUserFacts(userId, prompt).catch(() => {});
        }

        const effectiveAttachment = pdfAttachment || (file ? {
            name: file.originalname || "Uploaded Document.pdf",
            size: file.size,
            path: file.path,
            buffer: file.buffer,
            mimetype: file.mimetype,
        } : null);

        const userMessageText = effectiveAttachment?.name
            ? `[📄 Attached PDF: ${effectiveAttachment.name}]\n${prompt}`
            : prompt;

        if (chatUrl) {
            await axios.post(`${chatUrl}/create-message`, {
                conversationId,
                role: "user",
                content: userMessageText
            }).catch(err => console.warn("Chat service message write skipped:", err.message));
        }

        const startTime = Date.now();

        const result = await graph.invoke({
            prompt,
            conversationId,
            agent: isDeepResearch ? "deepResearchAgent" : (agent || (effectiveAttachment ? "pdfRagAgent" : "auto")),
            pdfAttachment: effectiveAttachment,
            file: file,
            userId: userId,
            isDeepResearch: Boolean(isDeepResearch),
        });

        const aiResponse = result?.aiResponse || "No response generated.";
        const images = result?.images || [];
        const artifacts = result?.artifacts || [];
        const thoughtSteps = result?.thoughtSteps || [];
        const executionTrace = result?.executionTrace || [];
        const totalDurationMs = Date.now() - startTime;

        const telemetry = {
            totalDurationMs,
            totalDurationSec: (totalDurationMs / 1000).toFixed(2),
            nodeCount: executionTrace.length || 2,
            agent: result?.agent || agent || "auto",
            isDeepResearch: Boolean(isDeepResearch || result?.isDeepResearch),
            timestamp: new Date().toISOString(),
        };

        await addMessage(conversationId, "user", prompt, [], userId);
        await addMessage(conversationId, "assistant", aiResponse, artifacts, userId);

        if (chatUrl) {
            await axios.post(`${chatUrl}/create-message`, {
                conversationId,
                role: "assistant",
                content: aiResponse,
                images,
                artifacts,
                thoughtSteps,
                executionTrace,
                telemetry,
            }).catch(err => console.warn("Chat service assistant write skipped:", err.message));
        }

        return res.status(200).json({
            answer: aiResponse,
            images,
            artifacts,
            thoughtSteps,
            executionTrace,
            telemetry,
            isDeepResearch: Boolean(isDeepResearch || result?.isDeepResearch),
        });

    } catch (error) {
        console.error(`Error in chatAgentController: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message || "Agent execution failed." });
    }
};