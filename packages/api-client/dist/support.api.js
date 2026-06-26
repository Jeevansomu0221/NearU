import { apiGet, apiPost, apiPut } from "./client.js";
export const getSupportFAQs = () => apiGet("/support/faqs");
export const getMySupportTickets = (category) => apiGet("/support/tickets", category ? { params: { category } } : undefined);
export const createSupportTicket = (payload) => apiPost("/support/tickets", payload);
export const sendSupportMessage = (ticketId, message) => apiPost(`/support/tickets/${ticketId}/messages`, { message });
export const updateSupportTicketStatus = (ticketId, status) => apiPut(`/support/tickets/${ticketId}/status`, { status });
