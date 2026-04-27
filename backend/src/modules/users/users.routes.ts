import { Router } from 'express';
import {
  listUsers,
  getUser,
  createOwnerCredentials,
  resetPassword,
  dashboardStats,
} from './users.controller';
import { authMiddleware, requireSuperAdmin } from '../../middleware/authMiddleware';

const router = Router();

// GET /api/users - list all (optional ?status=ACTIVE|TRIAL|EXPIRED)
router.get('/', listUsers);

// GET /api/users/stats - dashboard stats
router.get('/stats', dashboardStats);

// GET /api/users/:id - single tenant
router.get('/:id', getUser);

// POST /api/users/create-owner - create owner credentials
router.use(authMiddleware, requireSuperAdmin);

router.post('/create-owner', createOwnerCredentials);

// POST /api/users/:tenantId/reset-password
router.post('/:tenantId/reset-password', resetPassword);

export default router;
