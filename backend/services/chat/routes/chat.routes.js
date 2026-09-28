import { Router } from "express";
import { createConversation, createMessage, getConversation, getMessages, updateConversation, deleteConversation } from "../controller/chat.controller.js";

const router = Router();

router.post("/create-conversation", createConversation);
router.get("/create-conversation", createConversation);
router.get("/get-conversation", getConversation);
router.post("/create-message", createMessage);
router.get("/get-messages/:conversationId", getMessages);
router.post("/update-conversation", updateConversation);
router.post("/delete-conversation", deleteConversation);

export default router;