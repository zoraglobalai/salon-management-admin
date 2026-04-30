import { Router } from 'express';
import {
  listTickets,
  ownerSupportContact,
  ownerTicketCreate,
  ownerTicketList,
  ticketStats,
  updateTicket,
} from './support.controller';
import { authMiddleware, requireSuperAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.get('/owner/contact', authMiddleware, ownerSupportContact);
router.get('/owner', authMiddleware, ownerTicketList);
router.post('/owner', authMiddleware, ownerTicketCreate);

router.get('/', authMiddleware, requireSuperAdmin, listTickets);
router.get('/stats', authMiddleware, requireSuperAdmin, ticketStats);
router.patch('/:id', authMiddleware, requireSuperAdmin, updateTicket);

export default router;
