import { Router } from 'express';
import { listSubscriptions, subscriptionStats } from './subscriptions.controller';

const router = Router();

router.get('/', listSubscriptions);
router.get('/stats', subscriptionStats);

export default router;
