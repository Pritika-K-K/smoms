import { Router } from 'express';
import { handleGetAuditLogs } from './auditLogs.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('ADMIN'), handleGetAuditLogs);

export default router;
