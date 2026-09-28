import { Router } from "express";
import { chatAgentController } from "../controllers/agent.controller.js";

const router = Router()

router.post("/chat" , chatAgentController)

export default router