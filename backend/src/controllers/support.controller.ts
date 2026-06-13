import { Response } from "express";
import SupportTicket from "../models/SupportTicket.model";
import { AuthRequest } from "../middlewares/auth.middleware";
import { errorResponse, successResponse } from "../utils/response";

const FAQs = [
  {
    question: "How long does delivery take?",
    answer: "Most Vyaha orders are delivered in 30-45 minutes. Timings can vary by restaurant preparation time, distance, weather, and rider availability."
  },
  {
    question: "Can I cancel an order?",
    answer: "You can ask support to cancel while the restaurant has not started preparing your order. Once preparation or pickup starts, cancellation depends on the restaurant and payment status."
  },
  {
    question: "What if I paid online but the order failed?",
    answer: "If payment is captured and the order is not confirmed, report the issue with your registered phone number and payment reference. Vyaha support will verify it from the admin panel."
  },
  {
    question: "How do refunds work?",
    answer: "Eligible refunds are reviewed by support and processed to the original payment method. Bank or UPI timelines are controlled by the payment provider."
  },
  {
    question: "Can I save multiple delivery addresses?",
    answer: "Yes. Add Home, Work, or other addresses from Profile, then mark the one you want to use as default before checkout."
  }
];

const SUPPORT_CATEGORIES = [
  "CUSTOMER_SUPPORT",
  "ORDER",
  "PAYMENT",
  "DELIVERY",
  "ACCOUNT",
  "REPORT_ISSUE",
  "OTHER"
] as const;

const SUPPORT_CATEGORY_SET = new Set<string>(SUPPORT_CATEGORIES);

const normalizeCategoryFilter = (value: unknown) => {
  if (typeof value !== "string" || value === "ALL") return undefined;
  return SUPPORT_CATEGORY_SET.has(value) ? value : undefined;
};

const ensureCustomer = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    errorResponse(res, "Unauthorized", 401);
    return false;
  }

  return true;
};

export const getSupportFAQs = async (_req: AuthRequest, res: Response) => {
  return successResponse(res, FAQs, "FAQs retrieved successfully");
};

export const getMySupportTickets = async (req: AuthRequest, res: Response) => {
  if (!ensureCustomer(req, res)) return;

  try {
    const category = normalizeCategoryFilter(req.query.category);
    const filter = {
      userId: req.user!.id,
      ...(category ? { category } : {})
    };

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(res, tickets, "Support tickets retrieved successfully");
  } catch (error: any) {
    console.error("getMySupportTickets error:", error);
    return errorResponse(res, "Failed to get support tickets");
  }
};

export const createSupportTicket = async (req: AuthRequest, res: Response) => {
  if (!ensureCustomer(req, res)) return;

  try {
    const { subject, message, category, orderId, priority } = req.body;
    const cleanSubject = String(subject || "").trim();
    const cleanMessage = String(message || "").trim();
    const cleanCategory = SUPPORT_CATEGORY_SET.has(category) ? category : "CUSTOMER_SUPPORT";

    if (!cleanSubject || !cleanMessage) {
      return errorResponse(res, "Subject and message are required", 400);
    }

    const ticket = await SupportTicket.create({
      userId: req.user!.id,
      orderId: orderId || undefined,
      category: cleanCategory,
      subject: cleanSubject,
      priority: priority || "NORMAL",
      status: "OPEN",
      lastCustomerMessageAt: new Date(),
      messages: [{
        senderRole: "customer",
        senderId: req.user!.id,
        message: cleanMessage
      }]
    });

    return successResponse(res, ticket, "Support request sent successfully", 201);
  } catch (error: any) {
    console.error("createSupportTicket error:", error);
    return errorResponse(res, "Failed to create support request");
  }
};

export const addCustomerSupportMessage = async (req: AuthRequest, res: Response) => {
  if (!ensureCustomer(req, res)) return;

  try {
    const cleanMessage = String(req.body.message || "").trim();
    if (!cleanMessage) {
      return errorResponse(res, "Message is required", 400);
    }

    const ticket = await SupportTicket.findOne({ _id: req.params.ticketId, userId: req.user!.id });
    if (!ticket) {
      return errorResponse(res, "Support ticket not found", 404);
    }

    ticket.messages.push({
      senderRole: "customer",
      senderId: req.user!.id,
      message: cleanMessage
    } as any);
    ticket.status = ticket.status === "CLOSED" || ticket.status === "RESOLVED" ? "OPEN" : ticket.status;
    ticket.lastCustomerMessageAt = new Date();
    await ticket.save();

    return successResponse(res, ticket, "Message sent successfully");
  } catch (error: any) {
    console.error("addCustomerSupportMessage error:", error);
    return errorResponse(res, "Failed to send support message");
  }
};

export const getAllSupportTickets = async (req: AuthRequest, res: Response) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const category = normalizeCategoryFilter(req.query.category);
    const filter = {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(category ? { category } : {})
    };

    const tickets = await SupportTicket.find(filter)
      .populate("userId", "name phone email")
      .populate("orderId", "_id status grandTotal createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(res, tickets, "Support tickets retrieved successfully");
  } catch (error: any) {
    console.error("getAllSupportTickets error:", error);
    return errorResponse(res, "Failed to get support tickets");
  }
};

export const replyToSupportTicket = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    const cleanMessage = String(req.body.message || "").trim();
    if (!cleanMessage) {
      return errorResponse(res, "Message is required", 400);
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return errorResponse(res, "Support ticket not found", 404);
    }

    ticket.messages.push({
      senderRole: "admin",
      senderId: req.user.id,
      message: cleanMessage
    } as any);
    ticket.status = req.body.status || "IN_PROGRESS";
    ticket.lastAdminMessageAt = new Date();
    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate("userId", "name phone email")
      .populate("orderId", "_id status grandTotal createdAt");

    return successResponse(res, updatedTicket, "Reply sent successfully");
  } catch (error: any) {
    console.error("replyToSupportTicket error:", error);
    return errorResponse(res, "Failed to reply to support ticket");
  }
};

export const updateSupportTicketStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

    if (!validStatuses.includes(status)) {
      return errorResponse(res, "Invalid support ticket status", 400);
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.ticketId,
      { status },
      { new: true }
    )
      .populate("userId", "name phone email")
      .populate("orderId", "_id status grandTotal createdAt");

    if (!ticket) {
      return errorResponse(res, "Support ticket not found", 404);
    }

    return successResponse(res, ticket, "Support ticket status updated");
  } catch (error: any) {
    console.error("updateSupportTicketStatus error:", error);
    return errorResponse(res, "Failed to update support ticket status");
  }
};
