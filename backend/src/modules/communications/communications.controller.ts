import { Request, Response } from "express";
import { CommunicationsService } from "./communications.service";

export const CommunicationsController = {
  async getConversations(req: Request, res: Response) {
    try {
      const { id: userId, tenant_id, role } = (req as any).user;
      
      if (!tenant_id) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      const conversations = await CommunicationsService.getConversations(userId, tenant_id, role);
      res.json({ conversations });
    } catch (err: any) {
      console.error("Error fetching conversations:", err);
      res.status(500).json({ error: err.message });
    }
  },

  async getMessages(req: Request, res: Response) {
    try {
      const { id: userId } = (req as any).user;
      const { conversationId } = req.params;
      const messages = await CommunicationsService.getMessages(conversationId, userId);
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getUnreadCount(req: Request, res: Response) {
    try {
      const { id: userId } = (req as any).user;
      const count = await CommunicationsService.getTotalUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async initConversation(req: Request, res: Response) {
    try {
      const { tenant_id, id: userId } = (req as any).user;
      const { type, branchId } = req.body;
      
      if (!tenant_id) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      const conversationId = await CommunicationsService.ensureConversation(tenant_id, type, branchId, userId);
      res.json({ conversationId });
    } catch (err: any) {
      console.error("Error initializing conversation:", err);
      res.status(500).json({ error: err.message });
    }
  }
};
