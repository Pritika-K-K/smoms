import { getDepartmentCode } from '../../utils/ticketNumber.util.js';
import { generateTicketNumber } from '../../utils/ticketNumber.util.js';
import prisma, { withDbRetry } from '../../config/db.js';

export const getAllTickets = async ({ role, userId, status, priority, machineId }) => {
  const where = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (machineId) where.machineId = machineId;

  // Role specific filtering
  if (role === 'OPERATOR') {
    where.raisedById = userId;
  } else if (role === 'ENGINEER') {
    if (status && ['CLOSED', 'RESOLVED', 'IN_PROGRESS', 'NEEDS_REWORK', 'REJECTED'].includes(status)) {
      where.assignedEngineerId = userId;
    } else {
      where.OR = [
        { assignedEngineerId: userId },
        { status: 'OPEN' },
        { status: 'PENDING_REASSIGNMENT' },
      ];
    }
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      machine: {
        select: { id: true, name: true, department: { select: { id: true, name: true } } },
      },
      raisedBy: { select: { id: true, name: true, email: true } },
      assignedEngineer: { select: { id: true, name: true, email: true } },
      workOrder: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return tickets.map((t, idx) => {
    if (!t.ticketNumber) {
      const deptCode = getDepartmentCode(t.machine?.department?.name);
      const d = new Date(t.createdAt);
      const year = String(d.getFullYear()).slice(-2);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yymm = `${year}${month}`;
      const seq = String(idx + 1).padStart(3, '0');
      t.ticketNumber = `TKT-${deptCode}-${yymm}-${seq}`;
    }
    return t;
  });
};

export const getTicketById = async (id) => {
  return await prisma.ticket.findUnique({
    where: { id },
    include: {
      machine: {
        include: { department: true },
      },
      raisedBy: { select: { id: true, name: true, email: true, role: true } },
      assignedEngineer: { select: { id: true, name: true, email: true, role: true } },
      workOrder: true,
      notifications: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

export const createTicket = async ({ machineId, raisedById, description, priority = 'MEDIUM', attachment }) => {
  // Check if machine exists
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new Error('Machine not found');

  // Create ticket with formatted ticketNumber TKT-[DEPT]-[YYMM]-[SEQ]
  const ticketNumber = await generateTicketNumber(machineId);
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      machineId,
      raisedById,
      description,
      priority,
      attachment: attachment || null,
      status: 'OPEN',
    },
    include: {
      machine: true,
      raisedBy: { select: { id: true, name: true } },
    },
  });



  // 1. Notify the Operator who raised the ticket
  await prisma.notification.create({
    data: {
      userId: raisedById,
      ticketId: ticket.id,
      message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} raised successfully for machine "${machine.name}".`,
    },
  });

  // 2. Notify all engineers of new open ticket
  const engineers = await prisma.user.findMany({ where: { role: 'ENGINEER' } });
  for (const eng of engineers) {
    await prisma.notification.create({
      data: {
        userId: eng.id,
        ticketId: ticket.id,
        message: `New ticket raised for ${machine.name}: "${description.substring(0, 50)}..."`,
      },
    });
  }

  return ticket;
};

export const assignEngineer = async (ticketId, engineerId, assignedByUserId) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');

  if (assignedByUserId) {
    const assigner = await prisma.user.findUnique({ where: { id: assignedByUserId } });
    if (assigner && assigner.role === 'MANAGER') {
      const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
      if (hoursElapsed < 96 && ticket.status === 'OPEN' && !ticket.assignedEngineerId) {
        throw new Error('Manager manual assignment is only permitted for tickets unaccepted for 96+ hours.');
      }
    }
  }

  const engineer = await prisma.user.findUnique({ where: { id: engineerId } });
  if (!engineer || engineer.role !== 'ENGINEER') {
    throw new Error('Assigned user must be a valid Maintenance Engineer');
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedEngineerId: engineerId,
      status: 'ASSIGNED',
    },
    include: {
      machine: true,
      assignedEngineer: { select: { id: true, name: true, email: true } },
    },
  });

  // 1. Notify assigned engineer
  await prisma.notification.create({
    data: {
      userId: engineerId,
      ticketId: ticket.id,
      message: `You have been assigned to Ticket #${updatedTicket.ticketNumber || ticket.ticketNumber || ticket.id.slice(0, 8)} for machine "${updatedTicket.machine.name}".`,
    },
  });

  // 2. Notify Operator who raised the ticket
  if (ticket.raisedById) {
    await prisma.notification.create({
      data: {
        userId: ticket.raisedById,
        ticketId: ticket.id,
        message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for machine "${updatedTicket.machine.name}" has been assigned to Engineer ${engineer.name}.`,
      },
    });
  }

  return updatedTicket;
};

export const updateTicketStatus = async (ticketId, { status, notes, engineerId, engineerAttachment }) => {
  return await withDbRetry(async () => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { machine: true },
  });
  if (!ticket) throw new Error('Ticket not found');

  const data = { status };
  if (engineerId && !ticket.assignedEngineerId) {
    data.assignedEngineerId = engineerId;
  }

  if (status === 'REJECTED') {
    if (notes) {
      data.engineerNotes = notes;
    }
    if (engineerId) {
      data.assignedEngineerId = engineerId;
    }
  }

  if (status === 'RESOLVED') {
    if (notes) {
      data.engineerNotes = notes;
    }
    if (engineerAttachment) {
      data.engineerAttachment = engineerAttachment;
    }
    if (ticket.status === 'NEEDS_REWORK') {
      data.submissionCount = (ticket.submissionCount || 1) + 1;
    }
  }

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: {
      machine: true,
      raisedBy: { select: { id: true, name: true } },
      assignedEngineer: { select: { id: true, name: true } },
    },
  });

  // Notify Operator when status changes to REJECTED
  if (status === 'REJECTED' && ticket.raisedById) {
    const engineerName = updated.assignedEngineer?.name || 'Engineer';
    const reasonText = notes ? `: "${notes}"` : '.';
    await prisma.notification.create({
      data: {
        userId: ticket.raisedById,
        ticketId: ticket.id,
        message: `Ticket #${updated.ticketNumber || ticket.ticketNumber || ticket.id.slice(0, 8)} for ${updated.machine.name} was REJECTED by Eng. ${engineerName}${reasonText}`,
      },
    });
  }

  // Notify Operator when status changes to IN_PROGRESS
  if (status === 'IN_PROGRESS' && ticket.raisedById) {
    await prisma.notification.create({
      data: {
        userId: ticket.raisedById,
        ticketId: ticket.id,
        message: `Engineer ${updated.assignedEngineer?.name || 'assigned'} started repairs (IN_PROGRESS) on Ticket #${updated.ticketNumber || ticket.ticketNumber || ticket.id.slice(0, 8)} for ${updated.machine.name}.`,
      },
    });
  }

  // Notify Operator & Managers when status changes to RESOLVED
  if (status === 'REJECTED') {
    if (notes) {
      data.engineerNotes = notes;
    }
    if (engineerId) {
      data.assignedEngineerId = engineerId;
    }
  }

  if (status === 'RESOLVED') {
    // Notify Operator
    if (ticket.raisedById) {
      await prisma.notification.create({
        data: {
          userId: ticket.raisedById,
          ticketId: ticket.id,
          message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for ${updated.machine.name} has been marked RESOLVED by Engineer ${updated.assignedEngineer?.name || ''}. Pending manager sign-off.`,
        },
      });
    }

    // Notify Managers
    const managers = await prisma.user.findMany({ where: { role: 'MANAGER' } });
    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          userId: mgr.id,
          ticketId: ticket.id,
          message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for ${updated.machine.name} has been RESOLVED by ${updated.assignedEngineer?.name || 'Engineer'}. Pending approval.`,
        },
      });
    }
  }

    return updated;
  });
};

export const reviewTicketApproval = async (ticketId, { decision, notes, reason, comment, managerId }) => {
  return await withDbRetry(async () => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { machine: true },
  });
  if (!ticket) throw new Error('Ticket not found');

  const managerUser = managerId ? await prisma.user.findUnique({ where: { id: managerId } }) : null;

  if (decision === 'APPROVE') {
    const closedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });

    const workOrder = await prisma.workOrder.create({
      data: {
        ticketId,
        resolutionNotes: ticket.engineerNotes || notes || 'Ticket approved and closed by Production Manager.',
      },
    });

    await prisma.machine.update({
      where: { id: ticket.machineId },
      data: {},
    });

    const notifyUsers = Array.from(new Set([ticket.raisedById, ticket.assignedEngineerId].filter(Boolean)));
    for (const uId of notifyUsers) {
      await prisma.notification.create({
        data: {
          userId: uId,
          ticketId,
          message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for ${ticket.machine.name} has been APPROVED & CLOSED by Manager.`,
        },
      });
    }

    return { ticket: closedTicket, workOrder };
  } else if (decision === 'REJECT') {
    const existingHistory = Array.isArray(ticket.rejectionHistory) ? ticket.rejectionHistory : [];
    const rejectionReason = reason || 'Insufficient proof';
    const rejectionComment = comment || notes || '';

    const newRejectionRecord = {
      reason: rejectionReason,
      comment: rejectionComment,
      rejectedAt: new Date().toISOString(),
      submissionCount: ticket.submissionCount || 1,
      managerName: managerUser?.name || 'Manager',
    };

    const updatedHistory = [...existingHistory, newRejectionRecord];
    const totalRejections = updatedHistory.length;
    
    const newStatus = 'NEEDS_REWORK';

    const rejectedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        rejectionHistory: updatedHistory,
      },
      include: {
        machine: true,
        raisedBy: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    if (ticket.assignedEngineerId) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignedEngineerId,
          ticketId,
          message: `REJECTION NOTICE: Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for ${ticket.machine.name} was returned for rework. Reason: "${rejectionReason}". ${rejectionComment ? `Comment: ${rejectionComment}` : ''} [Status: ${newStatus}]`,
        },
      });
    }

    if (ticket.raisedById) {
      await prisma.notification.create({
        data: {
          userId: ticket.raisedById,
          ticketId,
          message: `Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} for ${ticket.machine.name} returned for rework by Manager. Reason: "${rejectionReason}".`,
        },
      });
    }

    return { ticket: rejectedTicket };
  } else {
    throw new Error('Invalid decision. Must be APPROVE or REJECT');
  }
  });
};

export const requestWithdrawal = async (ticketId, { engineerId, reason, comment }) => {
  return await withDbRetry(async () => {
    if (!reason) throw new Error('Withdrawal reason is required');

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        machine: true,
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    if (!ticket) throw new Error('Ticket not found');

    const currentHistory = Array.isArray(ticket.withdrawalHistory) ? ticket.withdrawalHistory : [];
    const newHistoryRecord = {
      reason,
      comment: comment || null,
      requestedAt: new Date(),
      status: 'WITHDRAWAL_REQUESTED',
    };

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'WITHDRAWAL_REQUESTED',
        assignedEngineerId: ticket.assignedEngineerId || engineerId,
        withdrawalReason: reason,
        withdrawalComment: comment || null,
        withdrawalRequestedAt: new Date(),
        withdrawalHistory: [...currentHistory, newHistoryRecord],
      },
      include: {
        machine: true,
        raisedBy: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    // Notify Managers of withdrawal request
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER' },
      select: { id: true },
    });

    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          userId: mgr.id,
          ticketId: updated.id,
          message: `Engineer ${updated.assignedEngineer?.name || 'Engineer'} requested withdrawal for Ticket #${updated.ticketNumber || updated.id.slice(0, 8)} (${updated.machine.name}): "${reason}".`,
        },
      });
    }

    return updated;
  });
};

export const reviewWithdrawal = async (ticketId, { managerId, decision, managerNotes }) => {
  return await withDbRetry(async () => {
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      throw new Error('Decision must be APPROVE or REJECT');
    }

    if (decision === 'REJECT' && (!managerNotes || !managerNotes.trim())) {
      throw new Error('Manager rejection reason is required when rejecting a withdrawal request');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        machine: true,
        raisedBy: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'WITHDRAWAL_REQUESTED') {
      throw new Error('Ticket is not currently pending withdrawal approval');
    }

    const currentEngineerId = ticket.assignedEngineerId;
    const currentEngineerName = ticket.assignedEngineer?.name || 'Engineer';
    const currentHistory = Array.isArray(ticket.withdrawalHistory) ? ticket.withdrawalHistory : [];

    let newStatus = 'IN_PROGRESS';
    let newEngineerId = currentEngineerId;
    let newPriority = ticket.priority;

    if (decision === 'APPROVE') {
      newStatus = 'PENDING_REASSIGNMENT';
      newEngineerId = null;
      newPriority = ticket.priority === 'LOW' ? 'MEDIUM' : 'HIGH';
    } else {
      newStatus = 'IN_PROGRESS';
      newEngineerId = currentEngineerId;
    }

    const newHistoryRecord = {
      decision,
      managerNotes: managerNotes || null,
      decidedAt: new Date(),
      managerId,
    };

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        assignedEngineerId: newEngineerId,
        priority: newPriority,
        withdrawalHistory: [...currentHistory, newHistoryRecord],
      },
      include: {
        machine: true,
        raisedBy: { select: { id: true, name: true } },
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    // 1. Notify Engineer
    if (currentEngineerId) {
      const engMessage =
        decision === 'APPROVE'
          ? `Your withdrawal request for Ticket #${updated.ticketNumber || ticket.id.slice(0, 8)} (${updated.machine.name}) was APPROVED by Manager.`
          : `Your withdrawal request for Ticket #${updated.ticketNumber || ticket.id.slice(0, 8)} (${updated.machine.name}) was REJECTED by Manager. Reason: "${managerNotes}".`;

      await prisma.notification.create({
        data: {
          userId: currentEngineerId,
          ticketId: updated.id,
          message: engMessage,
        },
      });
    }

    // 2. Notify Operator (ONLY if approved, simple status update without internal withdrawal reason!)
    if (decision === 'APPROVE' && ticket.raisedById) {
      await prisma.notification.create({
        data: {
          userId: ticket.raisedById,
          ticketId: updated.id,
          message: `Ticket #${updated.ticketNumber || ticket.id.slice(0, 8)} for ${updated.machine.name} has been reassigned for faster resolution.`,
        },
      });
    }

    return updated;
  });
};
