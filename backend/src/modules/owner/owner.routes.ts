import { Router } from 'express';
import { createOwnerManager, getOwnerProfile, listOwnerManagers, removeOwnerManager } from './owner.controller';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = Router();

// GET /api/owner/profile
router.get('/profile', authMiddleware, getOwnerProfile);
router.get('/managers', authMiddleware, listOwnerManagers);
router.post('/managers', authMiddleware, createOwnerManager);
router.delete('/managers/:managerId', authMiddleware, removeOwnerManager);

// GET /api/owner/locations (alias for profile or specific location fetching if needed)
router.get('/locations', authMiddleware, async (req, res, next) => {
  try {
    const { getOwnerProfileService } = await import('./owner.service');
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const profile = await getOwnerProfileService(userId);
    res.json({ success: true, data: profile.locations });
  } catch (error) {
    next(error);
  }
});

router.put('/managers/:managerId/reset-password', authMiddleware, async (req, res, next) => {
  try {
    const { resetOwnerManagerPassword } = await import('./owner.controller');
    await resetOwnerManagerPassword(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;
