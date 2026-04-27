import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllSubscriptions, getSubscriptionStats } from './subscriptions.service';

export const listSubscriptions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await getAllSubscriptions(status as string);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const subscriptionStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getSubscriptionStats();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
