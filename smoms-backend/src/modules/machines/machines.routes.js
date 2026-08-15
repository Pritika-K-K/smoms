import { Router } from 'express';
import {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineTelemetry,
} from './machines.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', getMachines);
router.get('/:id', getMachineById);
router.get('/:id/telemetry', getMachineTelemetry);

// Admin can create, update, delete machines
router.post('/', authorize('ADMIN'), createMachine);
router.put('/:id', authorize('ADMIN', 'MANAGER'), updateMachine);
router.delete('/:id', authorize('ADMIN'), deleteMachine);

export default router;
