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
    // Suppress non-critical transaction read preference warnings
    if (process.env.NODE_ENV !== 'production' && !error.message.includes('read preference')) {
      console.warn('[AuditLog] Non-critical log event bypassed:', error.message);
    }
  }
};
