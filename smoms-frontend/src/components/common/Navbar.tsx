import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Cpu, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { NotificationsDrawer } from '../notifications/NotificationsDrawer';
import { getNotificationsApi } from '../../api/notifications';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = () => {
    if (user) {
      getNotificationsApi()
        .then((res) => setUnreadCount(res.unreadCount))
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">SMOMS</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Smart Maintenance Platform</p>
          </div>
        </div>

        {/* Right side items */}
        <div className="flex items-center space-x-4">
          {/* Role badge */}
          {user && (
            <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 uppercase">
              {user.role} PORTAL
            </span>
          )}

          {/* Top-Right Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:border-blue-600 hover:text-blue-600 transition shadow-xs cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-extrabold text-white shadow-xs border-2 border-white">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </span>
            )}
          </button>

          {/* User profile */}
          <div className="flex items-center space-x-3 border-l border-slate-200 pl-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
              <p className="text-[10px] text-slate-500">{user?.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs">
              <UserIcon className="h-4 w-4 text-blue-600" />
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <NotificationsDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onUnreadCountChange={(c) => setUnreadCount(c)}
      />
    </>
  );
};
