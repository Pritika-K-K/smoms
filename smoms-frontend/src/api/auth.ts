import { apiClient } from './apiClient';
import { User } from '../types';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export const loginApi = async (email: string, password: string): Promise<LoginResponse['data']> => {
  const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return res.data.data;
};

export const getMeApi = async (): Promise<User> => {
  const res = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
  return res.data.data;
};

export const updateProfileApi = async (data: { name?: string; email?: string; phone?: string; password?: string }): Promise<User> => {
  const res = await apiClient.put<{ success: boolean; data: User; message: string }>('/auth/profile', data);
  return res.data.data;
};
