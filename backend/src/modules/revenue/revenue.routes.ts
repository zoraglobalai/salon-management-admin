import { Router } from 'express';
import { listTransactions, revenueOverview } from './revenue.controller';

const router = Router();

router.get('/', listTransactions);
router.get('/overview', revenueOverview);

export default router;
