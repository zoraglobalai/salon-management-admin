import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllLogs } from './logs.service';

export const listLogs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await getAllLogs(limit);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};
