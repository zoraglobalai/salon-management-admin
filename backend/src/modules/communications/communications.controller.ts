import { Request, Response } from "express";
import { CommunicationsService } from "./communications.service";

export const CommunicationsController = {
  async getConversations(req: Request, res: Response) {
    try {
      const { id: userId, tenantId, role } = (req as any).user;
      const conversations = await CommunicationsService.getConversations(userId, tenantId, role);
      res.json({ conversations });
    } catch (err: any) {
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
      const { tenantId, id: userId } = (req as any).user;
      const { type, branchId } = req.body;
      const conversationId = await CommunicationsService.ensureConversation(tenantId, type, branchId, userId);
      res.json({ conversationId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
};
