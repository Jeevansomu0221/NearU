import { apiGet, apiPost, apiPut } from "./client.js";
import type { ApiResponse } from "./types.js";

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface SupportMessage {
  _id?: string;
  senderRole: "customer" | "admin" | "partner";
  message: string;
  createdAt?: string;
}

export interface SupportTicket {
  _id: string;
  subject: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: string;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export const getSupportFAQs = (): Promise<ApiResponse<FAQEntry[]>> => apiGet<FAQEntry[]>("/support/faqs");

export const getMySupportTickets = (category?: string): Promise<ApiResponse<SupportTicket[]>> =>
  apiGet<SupportTicket[]>("/support/tickets", category ? { params: { category } } : undefined);

export const createSupportTicket = (payload: {
  subject: string;
  message: string;
  category?: string;
  orderId?: string;
  priority?: string;
}): Promise<ApiResponse<SupportTicket>> => apiPost<SupportTicket>("/support/tickets", payload);

export const sendSupportMessage = (ticketId: string, message: string): Promise<ApiResponse<SupportTicket>> =>
  apiPost<SupportTicket>(`/support/tickets/${ticketId}/messages`, { message });

export const updateSupportTicketStatus = (
  ticketId: string,
  status: SupportTicket["status"]
): Promise<ApiResponse<SupportTicket>> =>
  apiPut<SupportTicket>(`/support/tickets/${ticketId}/status`, { status });
