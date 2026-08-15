import * as notifService from './notifications.service.js';

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notifService.getUserNotifications(req.user.id);
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await notifService.markNotificationAsRead(id, req.user.id);
    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await notifService.markAllNotificationsAsRead(req.user.id);
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
