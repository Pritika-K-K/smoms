import { apiClient } from './apiClient';
import { Department } from '../types';

export const getDepartmentsApi = async (): Promise<Department[]> => {
  const res = await apiClient.get<{ success: boolean; data: Department[] }>('/departments');
  return res.data.data;
};

export const createDepartmentApi = async (name: string, code?: string): Promise<Department> => {
  const res = await apiClient.post<{ success: boolean; data: Department }>('/departments', { name, code });
  return res.data.data;
};

export const updateDepartmentApi = async (id: string, data: { name?: string; code?: string }): Promise<Department> => {
  const res = await apiClient.put<{ success: boolean; data: Department }>(`/departments/${id}`, data);
  return res.data.data;
};
