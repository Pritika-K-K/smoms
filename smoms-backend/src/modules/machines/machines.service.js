import prisma from '../../config/db.js';

export const getAllMachines = async (departmentId) => {
  const where = {};
  if (departmentId) where.departmentId = departmentId;

  return await prisma.machine.findMany({
    where,
    include: {
      department: { select: { id: true, name: true, code: true } },
      tickets: {
        include: {
          raisedBy: { select: { id: true, name: true, email: true } },
          assignedEngineer: { select: { id: true, name: true, email: true } },
          workOrder: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          tickets: { where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getMachineById = async (id) => {
  return await prisma.machine.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, code: true } },
      tickets: {
        include: {
          raisedBy: { select: { id: true, name: true } },
          assignedEngineer: { select: { id: true, name: true, email: true } },
          workOrder: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
};

export const createMachine = async ({ name, departmentId }) => {
  return await prisma.machine.create({
    data: {
      name,
      departmentId,
    },
    include: { department: true },
  });
};

export const updateMachine = async (id, { name, departmentId }) => {
  const data = {};
  if (name) data.name = name;
  if (departmentId) data.departmentId = departmentId;

  return await prisma.machine.update({
    where: { id },
    data,
    include: { department: true },
  });
};

export const deleteMachine = async (id) => {
  return await prisma.machine.delete({
    where: { id },
  });
};

export const getMachineTelemetry = async () => {
  return [];
};
