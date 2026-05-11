import { Request, Response } from "express";
import { NotificationsService } from "./notifications.service";

export async function handleGetNotifications(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await NotificationsService.getNotifications({
      userId: user.id,
      role: user.role,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    });

    res.json(notifications);
  } catch (error) {
    console.error("Error in handleGetNotifications:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleMarkAsRead(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    await NotificationsService.markAsRead(id, user.id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error in handleMarkAsRead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function handleMarkAllAsRead(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    await NotificationsService.markAllAsRead(user.id, user.role);

    res.json({ success: true });
  } catch (error) {
    console.error("Error in handleMarkAllAsRead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
