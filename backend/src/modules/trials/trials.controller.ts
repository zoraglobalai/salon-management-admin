import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllTrials, getTrialStats } from './trials.service';

export const listTrials = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const data = await getAllTrials(status as string);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const trialStats = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getTrialStats();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
