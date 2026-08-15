import { apiClient } from './apiClient';
import { User } from '../types';

export const getUsersApi = async (role?: string, departmentId?: string): Promise<User[]> => {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  if (departmentId) params.append('departmentId', departmentId);

  const res = await apiClient.get<{ success: boolean; data: User[] }>(`/users?${params.toString()}`);
  return res.data.data;
};

export const createUserApi = async (data: { name: string; email: string; password?: string; role: string; departmentId?: string }): Promise<User> => {
  const res = await apiClient.post<{ success: boolean; data: User }>('/users', data);
  return res.data.data;
};

export const updateUserApi = async (id: string, data: Partial<User & { password?: string }>): Promise<User> => {
  const res = await apiClient.put<{ success: boolean; data: User }>(`/users/${id}`, data);
  return res.data.data;
};

export const deleteUserApi = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};
