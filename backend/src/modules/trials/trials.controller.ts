import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { getAllTrials, getTrialSettings, getTrialStats, saveTrialSettings } from './trials.service';

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

export const trialSettings = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await getTrialSettings();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const updateTrialSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const trialPeriodDays = Number.parseInt(String(req.body?.trialPeriodDays ?? ''), 10);

    if (!Number.isInteger(trialPeriodDays)) {
      res.status(400).json({ success: false, message: 'Trial period days must be a whole number.' });
      return;
    }

    const data = await saveTrialSettings(trialPeriodDays);
    res.status(200).json({ success: true, message: 'Trial period updated successfully.', data });
  } catch (error) {
    next(error);
  }
};
