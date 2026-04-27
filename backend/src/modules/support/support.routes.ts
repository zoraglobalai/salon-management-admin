import { Router } from 'express';
import { listTickets, resolveTicket, ticketStats } from './support.controller';
import { authMiddleware, requireSuperAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.get('/', listTickets);
router.get('/stats', ticketStats);

router.use(authMiddleware, requireSuperAdmin);
router.patch('/:id/close', resolveTicket);

export default router;
