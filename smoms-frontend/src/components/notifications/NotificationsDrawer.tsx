import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { getNotificationsApi, markNotificationReadApi } from '../../api/notifications';
import { NotificationItem } from '../../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotificationsApi();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      if (onUnreadCountChange) onUnreadCountChange(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => {
        const newCount = Math.max(0, prev - 1);
        if (onUnreadCountChange) onUnreadCountChange(newCount);
        return newCount;
      });
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-700">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Click any unread notification to mark as read</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No notifications received yet.</div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.readAt && handleMarkAsRead(item.id)}
                className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition shadow-xs ${
                  item.readAt
                    ? 'border-slate-200 bg-white text-slate-600'
                    : 'border-blue-200 bg-blue-50/80 text-slate-900 font-medium'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="leading-relaxed flex-1 font-medium text-slate-800">{item.message}</p>
                  {!item.readAt && (
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0 ml-2 mt-1 shadow-xs" title="Unread"></span>
                  )}
                </div>
                <span className="mt-2 block text-[10px] text-slate-400 font-bold">
                  {new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
