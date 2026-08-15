import { apiClient } from './apiClient';
import { DashboardData } from '../types';

export const getDashboardApi = async (): Promise<DashboardData> => {
  const res = await apiClient.get<{ success: boolean; data: DashboardData }>('/dashboard');
  return res.data.data;
};
