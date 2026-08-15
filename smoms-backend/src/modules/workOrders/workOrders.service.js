import prisma from '../../config/db.js';

export const getAllWorkOrders = async () => {
  return await prisma.workOrder.findMany({
    include: {
      ticket: {
        include: {
          machine: { select: { id: true, name: true, department: { select: { name: true } } } },
          assignedEngineer: { select: { id: true, name: true } },
          raisedBy: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { closedAt: 'desc' },
  });
};

export const getWorkOrderById = async (id) => {
  return await prisma.workOrder.findUnique({
    where: { id },
    include: {
      ticket: {
        include: {
          machine: { include: { department: true } },
          assignedEngineer: { select: { id: true, name: true, email: true } },
          raisedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
};
