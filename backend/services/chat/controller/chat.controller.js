import Conversation from "../model/conversation.model.js";
import Message from "../model/message.model.js";

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];
        const title = req.body?.title || req.query?.title || "New Chat";

        const conversation = await Conversation.create({
            userId: userId,
            title: String(title).trim() || "New Chat",
        });

        return res.status(200).json(conversation);
    } catch (error) {
        console.error(`Error in createConversation Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};

export const getConversation = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'];

        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 });

        return res.status(200).json(conversations);
    } catch (error) {
        console.error(`Error in getConversation Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};

export const createMessage = async (req, res) => {
    try {
        const { content, role, conversationId, images, artifacts, thoughtSteps, executionTrace, telemetry, isDeepResearch } = req.body;

        if (!conversationId || !content) {
            return res.status(400).json({ message: "conversationId and content are required." });
        }

        const message = await Message.create({
            role: role || "user",
            conversationId,
            content,
            images: Array.isArray(images) ? images : [],
            artifacts: Array.isArray(artifacts) ? artifacts : [],
            thoughtSteps: Array.isArray(thoughtSteps) ? thoughtSteps : [],
            executionTrace: Array.isArray(executionTrace) ? executionTrace : [],
            telemetry: telemetry || {},
            isDeepResearch: Boolean(isDeepResearch),
        });

        await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() }).catch(() => {});

        return res.status(200).json(message);
    } catch (error) {
        console.error(`Error in createMessage Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!conversationId) {
            return res.status(400).json({ message: "conversationId is required." });
        }

        const messages = await Message.find({
            conversationId
        }).sort({ createdAt: 1 });

        return res.status(200).json(messages);
    } catch (error) {
        console.error(`Error in getMessages Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};

export const updateConversation = async (req, res) => {
    try {
        const { id, conversationId, title } = req.body;
        const targetId = id || conversationId;

        if (!targetId) {
            return res.status(400).json({ message: "id or conversationId is required." });
        }

        const cleanTitle = String(title || "").trim() || "New Chat";

        const conversation = await Conversation.findByIdAndUpdate(
            targetId,
            { title: cleanTitle },
            { new: true }
        );

        return res.status(200).json(conversation);
    } catch (error) {
        console.error(`Error in updateConversation Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const { id, conversationId } = req.body;
        const targetId = id || conversationId;

        if (!targetId) {
            return res.status(400).json({ message: "id is required." });
        }

        await Conversation.findByIdAndDelete(targetId);
        await Message.deleteMany({ conversationId: targetId });

        return res.status(200).json({ message: "Conversation deleted successfully" });
    } catch (error) {
        console.error(`Error in deleteConversation Controller: ${error?.message || error}`);
        return res.status(500).json({ message: "Internal Server Error", error: error?.message });
    }
};