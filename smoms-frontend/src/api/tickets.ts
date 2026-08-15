import { apiClient } from './apiClient';
import { Ticket, WorkOrder } from '../types';

export const getTicketsApi = async (filters?: { status?: string; priority?: string; machineId?: string }): Promise<Ticket[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.priority) params.append('priority', filters.priority);
  if (filters?.machineId) params.append('machineId', filters.machineId);

  const res = await apiClient.get<{ success: boolean; data: Ticket[] }>(`/tickets?${params.toString()}`);
  return res.data.data;
};

export const getTicketByIdApi = async (id: string): Promise<Ticket> => {
  const res = await apiClient.get<{ success: boolean; data: Ticket }>(`/tickets/${id}`);
  return res.data.data;
};

export const createTicketApi = async (data: { machineId: string; description: string; priority?: string; attachment?: string }): Promise<Ticket> => {
  const res = await apiClient.post<{ success: boolean; data: Ticket }>('/tickets', data);
  return res.data.data;
};

export const assignEngineerApi = async (ticketId: string, engineerId: string): Promise<Ticket> => {
  const res = await apiClient.put<{ success: boolean; data: Ticket }>(`/tickets/${ticketId}/assign`, { engineerId });
  return res.data.data;
};

export const updateTicketStatusApi = async (ticketId: string, status: string, notes?: string, engineerAttachment?: string): Promise<Ticket> => {
  const res = await apiClient.put<{ success: boolean; data: Ticket }>(`/tickets/${ticketId}/status`, { status, notes });
  return res.data.data;
};

export const reviewTicketApprovalApi = async (
  ticketId: string,
  decision: 'APPROVE' | 'REJECT',
  notes?: string, engineerAttachment?: string,
  reason?: string,
  comment?: string
): Promise<{ ticket: Ticket; workOrder?: WorkOrder }> => {
  const res = await apiClient.put<{ success: boolean; data: { ticket: Ticket; workOrder?: WorkOrder } }>(
    `/tickets/${ticketId}/review`,
    { decision, notes, reason, comment }
  );
  return res.data.data;
};

export const getWorkOrdersApi = async (): Promise<WorkOrder[]> => {
  const res = await apiClient.get<{ success: boolean; data: WorkOrder[] }>('/work-orders');
  return res.data.data;
};

export const requestWithdrawalApi = async (id: string, reason: string, comment?: string) => {
  const response = await apiClient.put<{ success: boolean; data: Ticket; message: string }>(`/tickets/${id}/withdraw`, {
    reason,
    comment,
  });
  return response.data;
};

export const reviewWithdrawalApi = async (id: string, decision: 'APPROVE' | 'REJECT', managerNotes?: string) => {
  const response = await apiClient.put<{ success: boolean; data: Ticket; message: string }>(`/tickets/${id}/review-withdrawal`, {
    decision,
    managerNotes,
  });
  return response.data;
};
