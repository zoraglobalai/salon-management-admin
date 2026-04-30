import { Router } from 'express';
import {
  listSubscriptions,
  ownerCustomSubscriptionRequest,
  ownerSubscriptionCheckout,
  ownerSubscriptionCurrent,
  subscriptionStats,
} from './subscriptions.controller';
import { requireSuperAdmin } from '../../middleware/authMiddleware';

const router = Router();

router.get('/owner/current', ownerSubscriptionCurrent);
router.post('/owner/checkout', ownerSubscriptionCheckout);
router.post('/owner/custom-request', ownerCustomSubscriptionRequest);

router.use(requireSuperAdmin);
router.get('/', listSubscriptions);
router.get('/stats', subscriptionStats);

export default router;
