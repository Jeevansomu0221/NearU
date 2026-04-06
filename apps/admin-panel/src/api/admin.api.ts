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
    fssaiUrl?: string;
    gstUrl?: string;
    shopLicenseUrl?: string;
    ownerIdProofUrl?: string;
    ownerPanUrl?: string;
    bankProofUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    addressProofUrl?: string;
    menuProofUrl?: string;
    operatingHoursNote?: string;
    isComplete?: boolean;
    submittedAt?: string;
  };
}

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
  address?: string;
  vehicleType?: "Bike" | "Cycle" | "Scooter" | "Motorcycle";
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  reviewComment?: string;
  isAvailable: boolean;
  status: "PENDING" | "VERIFIED" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  documents?: {
    aadhaarUrl?: string;
    panUrl?: string;
    drivingLicenseUrl?: string;
    vehicleRcUrl?: string;
    insuranceUrl?: string;
    cancelledChequeUrl?: string;
    bankAccountNumber?: string;
    bankIfsc?: string;
    submittedAt?: string;
    isComplete?: boolean;
  };
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

export const getOrder = async (orderId: string) => {
  const response = await api.get<ApiEnvelope<OrderRecord>>(`/admin/orders/${orderId}`);
  return response.data.data;
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  const response = await api.put<ApiEnvelope<OrderRecord>>(`/admin/orders/${orderId}/status`, { status });
  return response.data;
};
