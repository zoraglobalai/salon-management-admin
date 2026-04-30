import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllTransactions, getRevenueOverview } from './revenue.service';

export const listTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, search, plan, fromDate, toDate, period } = req.query;
    const data = await getAllTransactions({
      status: status as string,
      search: search as string,
      plan: plan as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      period: period as 'today' | 'yesterday' | 'last7days' | 'last30days',
    });
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const revenueOverview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, plan, fromDate, toDate, period } = req.query;
    const data = await getRevenueOverview({
      search: search as string,
      plan: plan as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      period: period as 'today' | 'yesterday' | 'last7days' | 'last30days',
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
