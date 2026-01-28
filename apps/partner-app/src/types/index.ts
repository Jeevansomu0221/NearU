// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth types
export interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  partnerId?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

// Partner types
export interface Partner {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  hasCompletedSetup?: boolean;
  menuItemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerStatusResponse extends ApiResponse {
  data: {
    _id: string;
    status: string;
    hasCompletedSetup?: boolean;
    menuItemsCount: number;
    restaurantName?: string;
    ownerName?: string;
    phone?: string;
  };
}