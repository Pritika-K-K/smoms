import { Router } from 'express';
import { handleGetAnalytics, handleExportCSV } from './reports.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/analytics', handleGetAnalytics);
router.get('/export-csv', handleExportCSV);

export default router;
