import {
  getAllTickets,
  requestWithdrawal,
  reviewWithdrawal,
  getTicketById,
  createTicket,
  assignEngineer,
  updateTicketStatus,
  reviewTicketApproval,
} from './tickets.service.js';
import { logAudit } from '../../middleware/auditLogger.js';

export const handleGetTickets = async (req, res, next) => {
  try {
    const { status, priority, machineId } = req.query;
    const tickets = await getAllTickets({
      role: req.user.role,
      userId: req.user.id,
      status,
      priority,
      machineId,
    });
    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleGetTicketById = async (req, res, next) => {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    return res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleCreateTicket = async (req, res, next) => {
  try {
    const { machineId, description, priority, attachment } = req.body;
    if (!machineId || !description) {
      return res.status(400).json({ success: false, message: 'Machine ID and description are required' });
    }

    const ticket = await createTicket({
      machineId,
      raisedById: req.user.id,
      description,
      priority,
      attachment,
    });

    await logAudit(req.user.id, 'CREATE_TICKET', 'Ticket', ticket.id);

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleAssignEngineer = async (req, res, next) => {
  try {
    const { engineerId } = req.body;
    if (!engineerId) {
      return res.status(400).json({ success: false, message: 'Engineer ID is required' });
    }

    const ticket = await assignEngineer(req.params.id, engineerId, req.user.id);
    await logAudit(req.user.id, 'ASSIGN_TICKET', 'Ticket', ticket.id);

    return res.status(200).json({
      success: true,
      message: 'Engineer assigned successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleUpdateStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const ticket = await updateTicketStatus(req.params.id, {
      status,
      notes,
      engineerId: req.user.role === 'ENGINEER' ? req.user.id : undefined,
    });

    await logAudit(req.user.id, `UPDATE_STATUS_${status}`, 'Ticket', ticket.id);

    return res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}`,
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleReviewApproval = async (req, res, next) => {
  try {
    const { decision, notes } = req.body;
    if (!decision) {
      return res.status(400).json({ success: false, message: 'Decision (APPROVE or REJECT) is required' });
    }

    const result = await reviewTicketApproval(req.params.id, {
      decision,
      notes,
      managerId: req.user.id,
    });

    await logAudit(req.user.id, `REVIEW_TICKET_${decision}`, 'Ticket', result.ticket.id);

    return res.status(200).json({
      success: true,
      message: `Ticket review decision '${decision}' submitted successfully`,
      data: result,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Aliases matching tickets.routes.js import names
export const getTickets = handleGetTickets;
export const getTicketByIdFunc = handleGetTicketById;
export const createTicketFunc = handleCreateTicket;
export const assignEngineerFunc = handleAssignEngineer;
export const updateStatus = handleUpdateStatus;
export const reviewApproval = handleReviewApproval;

export const handleRequestWithdrawal = async (req, res, next) => {
  try {
    const { reason, comment } = req.body;
    const ticket = await requestWithdrawal(req.params.id, {
      engineerId: req.user.id,
      reason,
      comment,
    });
    await logAudit(req.user.id, 'REQUEST_WITHDRAWAL', 'Ticket', ticket.id);

    return res.status(200).json({
      success: true,
      message: 'Withdrawal requested successfully',
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const handleReviewWithdrawal = async (req, res, next) => {
  try {
    const { decision, managerNotes } = req.body;
    const ticket = await reviewWithdrawal(req.params.id, {
      managerId: req.user.id,
      decision,
      managerNotes,
    });
    await logAudit(req.user.id, `REVIEW_WITHDRAWAL_${decision}`, 'Ticket', ticket.id);

    return res.status(200).json({
      success: true,
      message: `Withdrawal decision '${decision}' recorded successfully`,
      data: ticket,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
