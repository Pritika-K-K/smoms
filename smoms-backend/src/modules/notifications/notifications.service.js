import prisma from '../../config/db.js';

export const getUserNotifications = async (userId) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      ticket: { select: { id: true, status: true, priority: true } },
    },
  });
};

export const markNotificationAsRead = async (notificationId, userId) => {
  return await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
};

export const markAllNotificationsAsRead = async (userId) => {
  return await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};
