import { apiClient } from './apiClient';
import { AuditLogItem } from '../types';

export const getAuditLogsApi = async (limit = 100): Promise<AuditLogItem[]> => {
  const res = await apiClient.get<{ success: boolean; data: AuditLogItem[] }>(`/audit-logs?limit=${limit}`);
  return res.data.data;
};
