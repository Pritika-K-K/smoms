import { apiClient } from './apiClient';
import { NotificationItem } from '../types';

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export const getNotificationsApi = async (): Promise<NotificationsResponse> => {
  const res = await apiClient.get<{ success: boolean; data: NotificationsResponse }>('/notifications');
  return res.data.data;
};

export const markNotificationReadApi = async (id: string): Promise<void> => {
  await apiClient.put(`/notifications/${id}/read`);
};

export const markAllNotificationsReadApi = async (): Promise<void> => {
  await apiClient.put('/notifications/read-all');
};
