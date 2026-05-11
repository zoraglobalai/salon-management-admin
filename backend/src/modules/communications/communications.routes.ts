import { Router } from "express";
import { CommunicationsController } from "./communications.controller";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.get("/conversations", authMiddleware, CommunicationsController.getConversations);
router.get("/messages/:conversationId", authMiddleware, CommunicationsController.getMessages);
router.get("/unread", authMiddleware, CommunicationsController.getUnreadCount);
router.post("/init", authMiddleware, CommunicationsController.initConversation);

export default router;
