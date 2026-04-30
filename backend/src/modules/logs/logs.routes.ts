import { Router } from 'express';
import { listLogs, listNotifications } from './logs.controller';

const router = Router();

router.get('/notifications', listNotifications);
router.get('/', listLogs);

export default router;
