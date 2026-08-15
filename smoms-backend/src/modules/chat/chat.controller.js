import { getChatTickets, getTicketMessages, sendChatMessage } from './chat.service.js';

export const handleGetChatTickets = async (req, res, next) => {
  try {
    const tickets = await getChatTickets({
      userId: req.user.id,
      role: req.user.role,
    });
    return res.status(200).json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
};

export const handleGetTicketMessages = async (req, res, next) => {
  try {
    const messages = await getTicketMessages(req.params.ticketId, req.user.id);
    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

export const handleSendChatMessage = async (req, res, next) => {
  try {
    const chatMsg = await sendChatMessage({
      ticketId: req.params.ticketId,
      senderId: req.user.id,
      message: req.body.message,
    });
    return res.status(201).json({ success: true, data: chatMsg });
  } catch (err) {
    next(err);
  }
};
