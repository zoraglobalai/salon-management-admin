import { Router } from 'express';
import { listTrials, trialSettings, trialStats, updateTrialSettings } from './trials.controller';

const router = Router();

router.get('/settings', trialSettings);
router.put('/settings', updateTrialSettings);
router.get('/', listTrials);
router.get('/stats', trialStats);

export default router;
