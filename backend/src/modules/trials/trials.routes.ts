import { Router } from 'express';
import { listTrials, trialStats } from './trials.controller';

const router = Router();

router.get('/', listTrials);
router.get('/stats', trialStats);

export default router;
