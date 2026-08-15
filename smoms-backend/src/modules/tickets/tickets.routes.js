import { Router } from 'express';
import {
  handleGetTickets,
  handleRequestWithdrawal,
  handleReviewWithdrawal,
  handleGetTicketById,
  handleCreateTicket,
  handleAssignEngineer,
  handleUpdateStatus,
  handleReviewApproval,
} from './tickets.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', handleGetTickets);
router.get('/:id', handleGetTicketById);
router.post('/', handleCreateTicket); // Operator/Manager/Admin can raise

router.put('/:id/assign', authorize('ADMIN', 'MANAGER', 'ENGINEER'), handleAssignEngineer);
router.put('/:id/status', authorize('ENGINEER', 'MANAGER', 'ADMIN'), handleUpdateStatus);
router.put('/:id/review', authorize('MANAGER', 'ADMIN'), handleReviewApproval); // Approve/Reject by Manager/Admin

export default router;

router.put('/:id/withdraw', authorize('ENGINEER', 'MANAGER', 'ADMIN'), handleRequestWithdrawal);
router.put('/:id/review-withdrawal', authorize('MANAGER', 'ADMIN'), handleReviewWithdrawal);
