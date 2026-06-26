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
export declare const getSupportFAQs: () => Promise<ApiResponse<FAQEntry[]>>;
export declare const getMySupportTickets: (category?: string) => Promise<ApiResponse<SupportTicket[]>>;
export declare const createSupportTicket: (payload: {
    subject: string;
    message: string;
    category?: string;
    orderId?: string;
    priority?: string;
}) => Promise<ApiResponse<SupportTicket>>;
export declare const sendSupportMessage: (ticketId: string, message: string) => Promise<ApiResponse<SupportTicket>>;
export declare const updateSupportTicketStatus: (ticketId: string, status: SupportTicket["status"]) => Promise<ApiResponse<SupportTicket>>;
//# sourceMappingURL=support.api.d.ts.map