import prisma from '../config/db.js';

export const getDepartmentCode = (department) => {
  if (department && typeof department === 'object' && department.code) {
    return department.code.toUpperCase();
  }
  const name = typeof department === 'string' ? department : department?.name;
  if (!name) return 'GEN';
  const upper = name.trim().toUpperCase();
  if (upper.includes('ASSEMBLY') || upper.includes('ROBOTICS')) return 'ASM';
  if (upper.includes('MACHINING') || upper.includes('MILLING')) return 'MCH';
  if (upper.includes('QUALITY') || upper.includes('CONTROL')) return 'QUAL';
  if (upper.includes('STAMPING') || upper.includes('METALWORK')) return 'STMP';
  if (upper.includes('ELECTRICAL')) return 'ELEC';
  if (upper.includes('LOGISTICS')) return 'LOG';
  
  const clean = upper.replace(/[^A-Z0-9]/g, '');
  return clean.substring(0, 3) || 'GEN';
};

export const generateTicketNumber = async (machineId, raisedAt = new Date()) => {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { department: true },
  });

  const deptCode = getDepartmentCode(machine?.department);
  const deptId = machine?.departmentId;

  const year = String(raisedAt.getFullYear()).slice(-2);
  const month = String(raisedAt.getMonth() + 1).padStart(2, '0');
  const yymm = `${year}${month}`;

  const startOfMonth = new Date(raisedAt.getFullYear(), raisedAt.getMonth(), 1);
  const endOfMonth = new Date(raisedAt.getFullYear(), raisedAt.getMonth() + 1, 0, 23, 59, 59, 999);

  const count = await prisma.ticket.count({
    where: {
      machine: { departmentId: deptId },
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      ticketNumber: { not: null },
    },
  });

  const seqStr = String(count + 1).padStart(3, '0');
  return `TKT-${deptCode}-${yymm}-${seqStr}`;
};
