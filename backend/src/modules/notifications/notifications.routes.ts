import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import { 
  handleGetNotifications, 
  handleMarkAsRead, 
  handleMarkAllAsRead 
} from "./notifications.controller";

const router = Router();

router.get("/", authMiddleware, handleGetNotifications);
router.patch("/:id/read", authMiddleware, handleMarkAsRead);
router.patch("/read-all", authMiddleware, handleMarkAllAsRead);

export default router;
