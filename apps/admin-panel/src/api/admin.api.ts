import api from "./client";

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  totalPartners: number;
  pendingPartners: number;
  activePartners: number;
  totalEarnings: number;
  today: string;
}

export interface PartnerRecord {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address?: {
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    googleMapsLink?: string;
  };
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  menuItemsCount?: number;
  documents?: {
    fssaiNumber?: string;
    fssaiUrl?: string;
    panNumber?: string;
    panFrontUrl?: string;
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    gstUrl?: string;
    shopLicenseUrl?: string;
    ownerIdProofUrl?: string;
    ownerPanUrl?: string;
    bankProofUrl?: string;
    bankDocumentType?: "cheque" | "passbook" | "statement" | "";
    bankAccountHolderName?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    addressProofUrl?: string;
    menuProofUrl?: string;
    operatingHoursNote?: string;
    isComplete?: boolean;
    submittedAt?: string;
    reuploadFlags?: Partial<Record<DocumentReuploadKey, boolean>>;
    reuploadNotes?: string;
  };
}

export type DocumentReuploadKey =
  | "fssaiUrl"
  | "panFrontUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "bankProofUrl"
  | "addressProofUrl"
  | "gstUrl"
  | "shopLicenseUrl"
  | "ownerPanUrl"
  | "menuProofUrl";

export type DeliveryDocumentReuploadKey =
  | "profilePhotoUrl"
  | "aadhaarFrontUrl"
  | "aadhaarBackUrl"
  | "panFrontUrl"
  | "selfiePhotoUrl"
  | "drivingLicenseFrontUrl"
  | "drivingLicenseBackUrl"
  | "vehicleRcFrontUrl"
  | "vehicleRcBackUrl"
  | "insuranceUrl"
  | "bankProofUrl";

export interface OrderRecord {
  _id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deliveryAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  itemTotal: number;
  deliveryFee: number;
  grandTotal: number;
  note?: string;
  customerId?: {
    _id: string;
    name: string;
    phone: string;
  };
  partnerId?: {
    _id: string;
    restaurantName: string;
    phone: string;
    address?: unknown;
  };
  deliveryPartnerId?: {
    _id: string;
    name: string;
    phone: string;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface DeliveryPartnerRecord {
  _id: string;
  userId?: {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  termsAcceptedAt?: string;
  vehicleType?: "Bike" | "Cycle" | "Bicycle" | "Scooter" | "Motorcycle" | "Car";
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  isAvailable: boolean;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  documents?: {
    aadhaarNumber?: string;
    aadhaarFrontUrl?: string;
    aadhaarBackUrl?: string;
    aadhaarUrl?: string;
    panNumber?: string;
    panFrontUrl?: string;
    panUrl?: string;
    selfiePhotoUrl?: string;
    drivingLicenseFrontUrl?: string;
    drivingLicenseBackUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcFrontUrl?: string;
    vehicleRcBackUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    bankDocumentType?: "cheque" | "passbook" | "statement" | "";
    bankAccountHolderName?: string;
    cancelledChequeUrl?: string;
    bankPassbookUrl?: string;
    bankStatementUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    submittedAt?: string;
    isComplete?: boolean;
    reuploadFlags?: Partial<Record<DeliveryDocumentReuploadKey, boolean>>;
    reuploadNotes?: string;
  };
}

export interface SupportMessageRecord {
  _id?: string;
  senderRole: "customer" | "admin";
  message: string;
  createdAt?: string;
}

export interface SupportTicketRecord {
  _id: string;
  userId?: {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  orderId?: {
    _id: string;
    status?: string;
    grandTotal?: number;
    createdAt?: string;
  };
  category: "CUSTOMER_SUPPORT" | "ORDER" | "PAYMENT" | "DELIVERY" | "ACCOUNT" | "REPORT_ISSUE" | "OTHER";
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  messages: SupportMessageRecord[];
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const getDashboardStats = async () => {
  const response = await api.get<ApiEnvelope<DashboardStats>>("/admin/dashboard/stats");
  return response.data.data;
};

export const getPartners = async () => {
  const response = await api.get<ApiEnvelope<PartnerRecord[]>>("/admin/partners");
  return response.data.data;
};

export const getPartner = async (partnerId: string) => {
  const response = await api.get<ApiEnvelope<PartnerRecord>>(`/admin/partners/${partnerId}`);
  return response.data.data;
};

export const updatePartnerStatus = async (
  partnerId: string,
  status: PartnerRecord["status"],
  rejectionReason?: string
) => {
  const response = await api.put<ApiEnvelope<PartnerRecord>>(`/admin/partners/${partnerId}/status`, {
    status,
    rejectionReason
  });
  return response.data;
};

export const requestPartnerDocumentReupload = async (
  partnerId: string,
  payload: { keys: DocumentReuploadKey[]; note?: string; clear?: boolean }
) => {
  const response = await api.put<ApiEnvelope<{
    reuploadFlags: Partial<Record<DocumentReuploadKey, boolean>>;
    reuploadNotes: string;
  }>>(`/admin/partners/${partnerId}/documents/reupload`, payload);
  return response.data;
};

export const getOrders = async () => {
  const response = await api.get<ApiEnvelope<OrderRecord[]>>("/admin/orders");
  return response.data.data;
};

export const getDeliveryPartners = async () => {
  const response = await api.get<ApiEnvelope<DeliveryPartnerRecord[]>>("/delivery/admin/all");
  return response.data.data;
};

export const updateDeliveryPartnerStatus = async (
  deliveryPartnerId: string,
  status: DeliveryPartnerRecord["status"],
  reviewComment?: string
) => {
  const response = await api.put<ApiEnvelope<DeliveryPartnerRecord>>(`/delivery/admin/${deliveryPartnerId}/status`, {
    status,
    reviewComment
  });
  return response.data;
};

export const requestDeliveryPartnerDocumentReupload = async (
  deliveryPartnerId: string,
  payload: { keys: DeliveryDocumentReuploadKey[]; note?: string; clear?: boolean }
) => {
  const response = await api.put<ApiEnvelope<{
    reuploadFlags: Partial<Record<DeliveryDocumentReuploadKey, boolean>>;
    reuploadNotes: string;
    status: DeliveryPartnerRecord["status"];
    reviewComment?: string;
  }>>(`/delivery/admin/${deliveryPartnerId}/documents/reupload`, payload);
  return response.data;
};

export const getOrder = async (orderId: string) => {
  const response = await api.get<ApiEnvelope<OrderRecord>>(`/admin/orders/${orderId}`);
  return response.data.data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const response = await api.put<ApiEnvelope<OrderRecord>>(`/admin/orders/${orderId}/status`, { status });
  return response.data;
};

export const assignDeliveryPartnerToOrder = async (orderId: string, deliveryPartnerId: string) => {
  const response = await api.post<ApiEnvelope<OrderRecord>>(`/orders/admin/orders/${orderId}/assign-delivery`, {
    deliveryPartnerId
  });
  return response.data;
};

export const getSupportTickets = async (status?: string) => {
  const response = await api.get<ApiEnvelope<SupportTicketRecord[]>>("/admin/support/tickets", {
    params: status && status !== "ALL" ? { status } : undefined
  });
  return response.data.data;
};

export const replyToSupportTicket = async (ticketId: string, message: string, status?: SupportTicketRecord["status"]) => {
  const response = await api.post<ApiEnvelope<SupportTicketRecord>>(`/admin/support/tickets/${ticketId}/reply`, {
    message,
    status
  });
  return response.data;
};

export const updateSupportTicketStatus = async (ticketId: string, status: SupportTicketRecord["status"]) => {
  const response = await api.put<ApiEnvelope<SupportTicketRecord>>(`/admin/support/tickets/${ticketId}/status`, {
    status
  });
  return response.data;
};
