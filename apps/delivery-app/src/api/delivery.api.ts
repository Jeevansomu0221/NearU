import { apiGet, apiPost, apiPatch, ApiResponse } from "./client";
import type { AddressLike } from "../utils/address";

// Interfaces
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
}

export interface CustomerInfo {
  _id: string;
  name: string;
  phone: string;
}

export interface PartnerInfo {
  _id: string;
  restaurantName: string;
  shopName: string;
  phone: string;
  address: AddressLike;
  googleMapsLink?: string;  // ADD THIS
  location?: {
    coordinates: [number, number];
  };
}

export interface DeliveryPartnerInfo {
  _id: string;
  name: string;
  phone: string;
  vehicleType?: string;
}

export interface DeliveryOrder {
  _id: string;
  orderId?: string; // For backward compatibility
  status: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  deliveryAddress: string;
  deliveryLocation?: {
    coordinates: [number, number];
  };
  deliveryGoogleMapsLink?: string;
  note: string;
  items: OrderItem[];
  customerId: CustomerInfo;
  partnerId: PartnerInfo;
  deliveryPartnerId?: DeliveryPartnerInfo;
  grandTotal: number;
  itemTotal: number;
  deliveryFee: number;
  tipAmount?: number;
  paymentMethod: string;
  paymentStatus: string;
  estimatedDistance?: number;
  estimatedEarnings?: number;
  deliveryEarnings?: number;
  collectedAmount?: number;
  deliveryBundleId?: string;
  deliveryBundleSize?: number;
  isBundledDelivery?: boolean;
  pickupStops?: Array<{
    orderId: string;
    sequence: number;
    status: string;
    partnerId: PartnerInfo;
    items: OrderItem[];
    itemTotal: number;
    deliveryFee: number;
    grandTotal: number;
  }>;
  bundleOrders?: DeliveryOrder[];
}

export interface DeliveryJob extends DeliveryOrder {
  distanceToRestaurant?: number | null;
  distanceToCustomer?: number;
  totalDistance?: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  totalEarnings: number;
  walletBalance?: number;
  grossPendingEarnings?: number;
  canWithdraw?: boolean;
  cashDueToPlatform?: number;
  lifetimeDeliveredEarnings?: number;
  todaysDeliveries: number;
  todaysEarnings: number;
  averageDeliveryTime: number;
  acceptanceRate?: number;
  acceptedJobs?: number;
  rejectedJobs?: number;
  cashBalance?: number;
  pendingDepositAmount?: number;
  cashDueToPlatform?: number;
}

export interface CashLedgerEntry {
  _id: string;
  type: "COD_COLLECTED" | "EARNINGS_OFFSET" | "CASH_DEPOSIT_SUBMITTED" | "CASH_DEPOSIT_VERIFIED";
  amount: number;
  balanceDelta: number;
  status: "POSTED" | "PENDING" | "VERIFIED" | "REJECTED";
  reference?: string;
  proofUrl?: string;
  note?: string;
  createdAt: string;
}

export interface CashLedgerSummary {
  cashBalance: number;
  pendingDepositAmount: number;
  totalCodReturned?: number;
  entries: CashLedgerEntry[];
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
}

const STATUS_UPDATE_REQUEST_CONFIG = {
  // Status updates are mutations. Retrying them against fallback hosts can make
  // the button appear stuck and can duplicate a pickup/delivery transition.
  _skipBaseUrlRetry: true
};

// =================== DELIVERY JOBS ===================

/**
 * Get available delivery jobs (READY orders not assigned)
 */
export const getAvailableJobs = (): Promise<ApiResponse<DeliveryJob[]>> => {
  return apiGet<DeliveryJob[]>("/orders/delivery/available-jobs");
};

/**
 * Get job details by ID
 */
export const getJobDetails = (orderId: string): Promise<ApiResponse<DeliveryJob>> => {
  return apiGet<DeliveryJob>(`/orders/delivery/${orderId}`);
};

/**
 * Accept a delivery job
 */
export const acceptJob = (orderId: string): Promise<ApiResponse<DeliveryOrder>> => {
  return apiPost<DeliveryOrder>(`/orders/delivery/${orderId}/accept`);
};

/**
 * Reject a delivery job
 */
export const rejectJob = (orderId: string): Promise<ApiResponse<{ message: string }>> => {
  return apiPost<{ message: string }>(`/orders/delivery/${orderId}/reject`, {
    reason: "Not available"
  });
};

// =================== MY ORDERS ===================

/**
 * Get my assigned delivery orders
 */
export const getMyDeliveryOrders = (): Promise<ApiResponse<DeliveryOrder[]>> => {
  return apiGet<DeliveryOrder[]>("/orders/delivery/my");
};

/**
 * Get order details (for assigned orders)
 */
export const getMyOrderDetails = (orderId: string): Promise<ApiResponse<DeliveryOrder>> => {
  return apiGet<DeliveryOrder>(`/orders/delivery/${orderId}`);
};

// =================== ORDER STATUS UPDATES ===================

/**
 * Update delivery status
 */
export const updateDeliveryStatus = (
  orderId: string, 
  status: "PICKED_UP" | "DELIVERED" | "CANCELLED",
  location?: LocationUpdate
): Promise<ApiResponse<DeliveryOrder>> => {
  const data: any = { status };
  if (location) {
    data.location = location;
  }
  return apiPost<DeliveryOrder>(`/orders/delivery/${orderId}/status`, data, STATUS_UPDATE_REQUEST_CONFIG);
};

/**
 * Mark order as picked up
 */
export const markAsPickedUp = (
  orderId: string,
  location?: LocationUpdate
): Promise<ApiResponse<DeliveryOrder>> => {
  return updateDeliveryStatus(orderId, "PICKED_UP", location);
};

/**
 * Mark order as delivered
 */
export const markAsDelivered = (
  orderId: string,
  location?: LocationUpdate,
  collectedAmount?: number,
  collectionMethod?: "CASH" | "UPI"
): Promise<ApiResponse<DeliveryOrder>> => {
  const data: any = { 
    status: "DELIVERED",
    collectedAmount,
    collectionMethod
  };
  if (location) {
    data.location = location;
  }
  return apiPost<DeliveryOrder>(`/orders/delivery/${orderId}/status`, data, STATUS_UPDATE_REQUEST_CONFIG);
};

export interface CodUpiSession {
  provider: "razorpay_qr" | "platform_upi";
  razorpayQrId?: string;
  qrImageUrl?: string;
  qrDataUrl?: string;
  upiUri?: string;
  paymentUrl: string;
  amount: number;
  orderRef: string;
  payeeName: string;
  manualConfirmRequired?: boolean;
}

export const createCodUpiCollection = (orderId: string): Promise<ApiResponse<CodUpiSession>> => {
  return apiPost<CodUpiSession>(`/orders/delivery/${orderId}/cod-upi`, {}, STATUS_UPDATE_REQUEST_CONFIG);
};

export const getCodUpiPaymentStatus = (
  orderId: string
): Promise<ApiResponse<{ paid: boolean; manualConfirmRequired?: boolean; amount?: number; provider?: string }>> => {
  return apiGet(`/orders/delivery/${orderId}/cod-upi/status`);
};

export const confirmCodUpiPayment = (orderId: string): Promise<ApiResponse<{ paid: boolean }>> => {
  return apiPost<{ paid: boolean }>(`/orders/delivery/${orderId}/cod-upi/confirm`, {}, STATUS_UPDATE_REQUEST_CONFIG);
};

// =================== DELIVERY STATS ===================

/**
 * Get delivery partner statistics
 */
export const getDeliveryStats = (): Promise<ApiResponse<DeliveryStats>> => {
  return apiGet<DeliveryStats>("/delivery/stats");
};

/**
 * Get today's earnings
 */
export const getTodaysEarnings = (): Promise<ApiResponse<{ earnings: number; cashBalance?: number; pendingDepositAmount?: number }>> => {
  return apiGet<{ earnings: number; cashBalance?: number; pendingDepositAmount?: number }>("/delivery/earnings/today");
};

export const getCashLedger = (): Promise<ApiResponse<CashLedgerSummary>> => {
  return apiGet<CashLedgerSummary>("/delivery/cash-ledger");
};

export const submitCashDeposit = (payload: {
  amount: number;
  reference?: string;
  proofUrl?: string;
  note?: string;
}): Promise<ApiResponse<CashLedgerEntry>> => {
  return apiPost<CashLedgerEntry>("/delivery/cash-deposits", payload);
};

export interface WithdrawalWallet {
  walletBalance: number;
  totalPaidEarnings: number;
  availableBalance: number;
  grossEarnings: number;
  cashHeld: number;
  cashOffset: number;
  netPayable: number;
  cashDueToPlatform: number;
  canWithdraw?: boolean;
  pendingPayoutOrderCount: number;
  pendingDepositAmount: number;
  hasBankDetails: boolean;
  bankVerified: boolean;
  bankVerificationStatus?: string;
  bankReviewComment?: string;
  bankDetails: {
    accountHolderName: string;
    maskedAccountNumber: string;
    ifsc: string;
    upiId: string;
  };
  pendingRequest: {
    _id: string;
    amount: number;
    status: string;
    createdAt: string;
  } | null;
  lastPaidWithdrawal?: {
    _id: string;
    amount: number;
    status: string;
    reviewedAt?: string;
    paidReference?: string;
  } | null;
  lastPaidPayout?: {
    _id: string;
    amount: number;
    paidAt: string;
    paidReference?: string;
  } | null;
  payouts: Array<{
    _id: string;
    amount: number;
    orderCount: number;
    status: string;
    paidAt: string;
    paidReference?: string;
    paidNotes?: string;
  }>;
  withdrawalHistory: Array<{
    _id: string;
    amount: number;
    status: string;
    createdAt: string;
    reviewedAt?: string;
    paidReference?: string;
    rejectionReason?: string;
  }>;
}

export const getWithdrawalWallet = (): Promise<ApiResponse<WithdrawalWallet>> => {
  return apiGet<WithdrawalWallet>("/delivery/withdrawal-wallet");
};

export const requestWithdrawal = (): Promise<ApiResponse<{ _id: string; amount: number; status: string }>> => {
  return apiPost("/delivery/withdrawals", {});
};

// =================== LOCATION UPDATES ===================

/**
 * Update delivery partner location
 */
export const updateLocation = (location: LocationUpdate): Promise<ApiResponse<{ message: string }>> => {
  return apiPost<{ message: string }>("/delivery/location", location);
};

/**
 * Calculate distance between locations
 */
export const calculateDistance = (
  origin: LocationUpdate,
  destination: LocationUpdate
): Promise<ApiResponse<{ distance: number; duration: number }>> => {
  return apiPost<{ distance: number; duration: number }>("/delivery/calculate-distance", {
    origin,
    destination
  });
};
