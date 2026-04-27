import { Router } from 'express';
import { listLogs } from './logs.controller';

const router = Router();

router.get('/', listLogs);

export default router;
