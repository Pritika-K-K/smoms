import { apiClient } from './apiClient';

export interface AnalyticsData {
  departmentHealth: { department: string; avgHealth: number; running: number; down: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsByStatus: { status: string; count: number }[];
  recentTickets: any[];
}

export const getAnalyticsApi = async (): Promise<AnalyticsData> => {
  const res = await apiClient.get<{ success: boolean; data: AnalyticsData }>('/reports/analytics');
  return res.data.data;
};

export const downloadTicketsCSV = async (): Promise<void> => {
  const response = await apiClient.get('/reports/export-csv', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `smoms_report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
