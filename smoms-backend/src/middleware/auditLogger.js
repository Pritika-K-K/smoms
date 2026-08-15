import prisma from '../config/db.js';

export const logAudit = async (userId, action, entityType, entityId) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: String(entityId),
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error.message);
  }
};
