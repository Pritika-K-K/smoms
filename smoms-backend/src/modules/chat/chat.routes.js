import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import {
  handleGetChatTickets,
  handleGetTicketMessages,
  handleSendChatMessage,
} from './chat.controller.js';

const router = Router();

router.use(authenticate);

router.get('/tickets', handleGetChatTickets);
router.get('/:ticketId/messages', handleGetTicketMessages);
router.post('/:ticketId/messages', handleSendChatMessage);

export default router;
