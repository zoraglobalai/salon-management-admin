import { Router } from 'express';
import { login, getProfile, forgotPassword, resetPassword, changePassword } from './auth.controller';
import { authMiddleware, requireSuperAdmin } from '../../middleware/authMiddleware';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile (protected)
router.get('/profile', authMiddleware, requireSuperAdmin, getProfile);

// GET /api/auth/me (protected, checks session validity)
router.get('/me', authMiddleware, getProfile);

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, changePassword);

export default router;
