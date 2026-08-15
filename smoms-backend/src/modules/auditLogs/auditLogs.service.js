import prisma from '../../config/db.js';

export const getAuditLogs = async (limit = 100) => {
  return await prisma.auditLog.findMany({
    take: limit,
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
};
