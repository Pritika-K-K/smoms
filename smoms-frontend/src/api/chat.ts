import { apiClient } from './apiClient';
import { ChatTicket, ChatMessage } from '../types';

export const getChatTicketsApi = async (): Promise<ChatTicket[]> => {
  const response = await apiClient.get('/chat/tickets');
  return response.data.data;
};

export const getTicketMessagesApi = async (ticketId: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/chat/${ticketId}/messages`);
  return response.data.data;
};

export const sendChatMessageApi = async (ticketId: string, message: string): Promise<ChatMessage> => {
  const response = await apiClient.post(`/chat/${ticketId}/messages`, { message });
  return response.data.data;
};
