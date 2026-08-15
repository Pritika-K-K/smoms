import { Router } from 'express';
import { handleGetDashboard } from './dashboard.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/', handleGetDashboard);

export default router;
