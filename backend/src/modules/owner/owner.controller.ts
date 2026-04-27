import { Request, Response, NextFunction } from 'express';
import {
  createOwnerManagerService,
  getOwnerProfileService,
  listOwnerManagersService,
  removeOwnerManagerService,
  resetOwnerManagerPasswordService,
} from './owner.service';

export const getOwnerProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // from authMiddleware
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const profile = await getOwnerProfileService(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const listOwnerManagers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const managers = await listOwnerManagersService(userId);
    res.json({ success: true, data: managers });
  } catch (error) {
    next(error);
  }
};

export const createOwnerManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { name, email, password, branchId } = req.body ?? {};

    if (!name || !email || !password || !branchId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and branch are required.',
      });
    }

    const manager = await createOwnerManagerService(userId, { name, email, password, branchId });
    res.status(201).json({ success: true, data: manager });
  } catch (error) {
    next(error);
  }
};

export const removeOwnerManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await removeOwnerManagerService(userId, req.params.managerId);
    res.json({ success: true, message: 'Manager removed successfully.' });
  } catch (error) {
    next(error);
  }
};

export const resetOwnerManagerPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { managerId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    // Import this service above if not already done, wait I should use the correct service import
    // I'll need to update the import as well
    // Wait, let's just make the changes then we'll update the import next
    // I will use replace_file_content on lines 1-7 in the next call, but let's just call it here
    const { resetOwnerManagerPasswordService } = require('./owner.service');
    
    await resetOwnerManagerPasswordService(userId, managerId, newPassword);
    res.json({ success: true, message: 'Manager password reset successfully.' });
  } catch (error) {
    next(error);
  }
};
