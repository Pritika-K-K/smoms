import { apiClient } from './apiClient';
import { Machine } from '../types';

export const getMachinesApi = async (departmentId?: string): Promise<Machine[]> => {
  const params = new URLSearchParams();
  if (departmentId) params.append('departmentId', departmentId);

  const res = await apiClient.get<{ success: boolean; data: Machine[] }>(`/machines?${params.toString()}`);
  return res.data.data;
};

export const getMachineByIdApi = async (id: string): Promise<Machine> => {
  const res = await apiClient.get<{ success: boolean; data: Machine }>(`/machines/${id}`);
  return res.data.data;
};

export const createMachineApi = async (data: { name: string; departmentId: string }): Promise<Machine> => {
  const res = await apiClient.post<{ success: boolean; data: Machine }>('/machines', data);
  return res.data.data;
};

export const deleteMachineApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/machines/${id}`);
};
