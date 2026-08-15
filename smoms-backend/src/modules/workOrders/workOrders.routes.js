import { Router } from 'express';
import { getWorkOrders, getWorkOrderById } from './workOrders.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.use(authenticate);
router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);

export default router;
