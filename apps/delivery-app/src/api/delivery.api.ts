import { apiGet, apiPost, apiPatch, ApiResponse } from "./client";

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
  address: string;  // This will now be a string
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
  deliveryAddress: string;
  deliveryLocation?: {
    coordinates: [number, number];
  };
  note: string;
  items: OrderItem[];
  customerId: CustomerInfo;
  partnerId: PartnerInfo;
  deliveryPartnerId?: DeliveryPartnerInfo;
  grandTotal: number;
  itemTotal: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
  estimatedDistance?: number;
  estimatedEarnings?: number;
}

export interface DeliveryJob extends DeliveryOrder {
  distanceToRestaurant?: number;
  distanceToCustomer?: number;
  totalDistance?: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  totalEarnings: number;
  todaysDeliveries: number;
  todaysEarnings: number;
  averageDeliveryTime: number;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
}

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
  return apiGet<DeliveryJob>(`/orders/${orderId}/details`);
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
  return apiGet<DeliveryOrder[]>("/orders/delivery/my-orders");
};

/**
 * Get order details (for assigned orders)
 */
export const getMyOrderDetails = (orderId: string): Promise<ApiResponse<DeliveryOrder>> => {
  return apiGet<DeliveryOrder>(`/orders/${orderId}/details`);
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
  return apiPatch<DeliveryOrder>(`/orders/delivery/${orderId}/status`, data);
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
  collectedAmount?: number
): Promise<ApiResponse<DeliveryOrder>> => {
  const data: any = { 
    status: "DELIVERED",
    collectedAmount 
  };
  if (location) {
    data.location = location;
  }
  return apiPatch<DeliveryOrder>(`/orders/delivery/${orderId}/deliver`, data);
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
export const getTodaysEarnings = (): Promise<ApiResponse<{ earnings: number }>> => {
  return apiGet<{ earnings: number }>("/delivery/earnings/today");
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