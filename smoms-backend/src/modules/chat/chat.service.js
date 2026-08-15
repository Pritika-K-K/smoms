import prisma, { withDbRetry } from '../../config/db.js';

const ACTIVE_CHAT_STATUSES = ['IN_PROGRESS', 'RESOLVED', 'NEEDS_REWORK', 'ASSIGNED'];

export const getChatTickets = async ({ userId, role }) => {
  return await withDbRetry(async () => {
    const where = {
      status: { in: ACTIVE_CHAT_STATUSES },
    };

    if (role === 'OPERATOR') {
      where.raisedById = userId;
    } else if (role === 'ENGINEER') {
      where.assignedEngineerId = userId;
    } else {
      where.id = { not: null };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        machine: { select: { id: true, name: true, department: { select: { name: true } } } },
        raisedBy: { select: { id: true, name: true, email: true } },
        assignedEngineer: { select: { id: true, name: true, email: true } },
        chatMessages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { message: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber || `TKT-${t.id.slice(0, 6).toUpperCase()}`,
      status: t.status,
      priority: t.priority,
      description: t.description,
      machineName: t.machine?.name || 'Machine',
      departmentName: t.machine?.department?.name || 'Shopfloor',
      operator: t.raisedBy,
      engineer: t.assignedEngineer,
      lastMessage: t.chatMessages[0] || null,
    }));
  });
};

export const getTicketMessages = async (ticketId, userId) => {
  return await withDbRetry(async () => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, raisedById: true, assignedEngineerId: true },
    });

    if (!ticket) throw new Error('Ticket not found');

    const messages = await prisma.chatMessage.findMany({
      where: { ticketId },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  });
};

export const sendChatMessage = async ({ ticketId, senderId, message }) => {
  return await withDbRetry(async () => {
    if (!message || !message.trim()) {
      throw new Error('Message text cannot be empty');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { machine: true },
    });

    if (!ticket) throw new Error('Ticket not found');

    if (!ACTIVE_CHAT_STATUSES.includes(ticket.status)) {
      throw new Error('Chat is disabled for this ticket. Chat is only enabled when work is IN_PROGRESS or RESOLVED.');
    }

    const isOperator = ticket.raisedById === senderId;
    const isEngineer = ticket.assignedEngineerId === senderId;

    if (!isOperator && !isEngineer) {
      throw new Error('Unauthorized to chat on this ticket');
    }

    const receiverId = isOperator ? ticket.assignedEngineerId : ticket.raisedById;

    if (!receiverId) {
      throw new Error('No assigned recipient available for this chat');
    }

    const chatMsg = await prisma.chatMessage.create({
      data: {
        ticketId,
        senderId,
        receiverId,
        message: message.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // In-app Notification to receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        ticketId,
        message: `New message on Ticket #${ticket.ticketNumber || ticket.id.slice(0, 8)} (${ticket.machine.name}): "${message.trim().substring(0, 40)}..."`,
      },
    });

    return chatMsg;
  });
};
