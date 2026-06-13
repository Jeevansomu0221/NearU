import { apiGet, apiPost, apiPut, ApiResponse } from "./client";

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface SupportMessage {
  _id?: string;
  senderRole: "customer" | "admin";
  message: string;
  createdAt?: string;
}

export interface SupportTicket {
  _id: string;
  subject: string;
  category: "CUSTOMER_SUPPORT" | "ORDER" | "PAYMENT" | "DELIVERY" | "ACCOUNT" | "REPORT_ISSUE" | "OTHER";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export type SupportTicketCategory = SupportTicket["category"];

export const getSupportFAQs = (): Promise<ApiResponse<FAQEntry[]>> => {
  return apiGet<FAQEntry[]>("/support/faqs");
};

export const getMySupportTickets = (category?: SupportTicketCategory): Promise<ApiResponse<SupportTicket[]>> => {
  return apiGet<SupportTicket[]>("/support/tickets", category ? { params: { category } } : undefined);
};

export const createSupportTicket = (payload: {
  subject: string;
  message: string;
  category?: SupportTicket["category"];
  orderId?: string;
  priority?: SupportTicket["priority"];
}): Promise<ApiResponse<SupportTicket>> => {
  return apiPost<SupportTicket>("/support/tickets", payload);
};

export const sendSupportMessage = (ticketId: string, message: string): Promise<ApiResponse<SupportTicket>> => {
  return apiPost<SupportTicket>(`/support/tickets/${ticketId}/messages`, { message });
};

export const updateSupportTicketStatus = (
  ticketId: string,
  status: SupportTicket["status"]
): Promise<ApiResponse<SupportTicket>> => {
  return apiPut<SupportTicket>(`/support/tickets/${ticketId}/status`, { status });
};
