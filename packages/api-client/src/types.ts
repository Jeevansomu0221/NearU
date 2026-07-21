export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  [key: string]: unknown;
}

export interface SavedAddress {
  _id?: string;
  label?: string;
  recipientName?: string;
  houseFlatDoorNo?: string;
  buildingApartmentName?: string;
  streetRoadName?: string;
  street?: string;
  city?: string;
  cityTownVillage?: string;
  state?: string;
  pincode?: string;
  area?: string;
  areaLocality?: string;
  landmark?: string;
  district?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UserProfile {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: SavedAddress;
  addresses?: SavedAddress[];
  createdAt?: string;
}

export interface Shop {
  _id: string;
  shopName: string;
  restaurantName?: string;
  category: string;
  address: string | SavedAddress;
  isOpen: boolean;
  rating: number;
  shopImageUrl?: string;
  closingTime?: string;
  openingTime?: string;
  phone?: string;
  distanceKm?: number;
}

export interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isVeg?: boolean;
  isAvailable?: boolean;
}

export interface CartItem {
  _id?: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
  menuItemId?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
}

export interface Order {
  _id: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  partnerId: unknown;
  customerId?: unknown;
  deliveryPartnerId?: unknown;
  deliveryAddress?: string;
  deliveryLocation?: { coordinates: [number, number] };
  note?: string;
  items: OrderItem[];
  itemTotal?: number;
  deliveryFee?: number;
  foodGst?: number;
  deliveryGst?: number;
  platformFee?: number;
  taxDiscount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  restaurantRating?: {
    foodQuality?: number;
    packaging?: number;
    overallExperience?: number;
    comment?: string;
  };
  deliveryRating?: {
    deliverySpeed?: number;
    partnerBehavior?: number;
    comment?: string;
  };
  ratingSubmittedAt?: string;
}

export interface OrderPricingQuote {
  groups: Array<{
    partnerId: string;
    shopName: string;
    itemTotal: number;
    deliveryFee: number;
    foodGst: number;
    deliveryGst: number;
    platformFee: number;
    taxDiscount: number;
    deliveryDistanceKm: number;
    grandTotal: number;
    payableTotal: number;
  }>;
  itemTotal: number;
  deliveryFee: number;
  foodGst: number;
  deliveryGst: number;
  platformFee: number;
  taxDiscount: number;
  deliveryDistanceKm: number;
  grandTotal: number;
  payableTotal: number;
}

export interface PartnerStatusData {
  _id: string;
  status: string;
  hasCompletedSetup?: boolean;
  menuItemsCount: number;
  restaurantName?: string;
  ownerName?: string;
  phone?: string;
}

export type UserRole = "customer" | "partner";
