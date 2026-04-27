import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllTransactions, getRevenueOverview } from './revenue.service';

export const listTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await getAllTransactions(status as string);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const revenueOverview = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getRevenueOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
