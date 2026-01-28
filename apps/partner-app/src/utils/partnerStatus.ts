import api from "../api/client";

export interface PartnerStatus {
  _id: string;
  status: string;
  hasCompletedSetup: boolean;
  menuItemsCount: number;
  restaurantName?: string;
  ownerName?: string;
}

interface ApiResponse {
  success: boolean;
  data: PartnerStatus;
  message?: string;
}

export const checkPartnerStatus = async (): Promise<PartnerStatus | null> => {
  try {
    const res = await api.get<ApiResponse>("/partners/my-status");
    
    // Type guard to ensure data structure
    if (res.data && res.data.success && res.data.data) {
      return res.data.data;
    }
    
    console.warn("Invalid response structure from partner status API");
    return null;
  } catch (error) {
    console.error("Failed to check partner status:", error);
    return null;
  }
};

// Helper function to determine if partner needs menu setup
export const needsMenuSetup = (partner: PartnerStatus | null): boolean => {
  if (!partner) return true;
  
  return (
    partner.status === "APPROVED" && 
    (!partner.hasCompletedSetup || partner.menuItemsCount === 0)
  );
};

// Helper function to get appropriate route based on partner status
export const getInitialRoute = (partner: PartnerStatus | null): string => {
  if (!partner) return "Login";
  
  switch (partner.status) {
    case "PENDING":
      return "PendingApproval";
    case "APPROVED":
      return needsMenuSetup(partner) ? "WelcomeApproved" : "Dashboard";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
      return "Login"; // Could have a suspended screen instead
    default:
      return "Login";
  }
};

// Cache for partner status to avoid repeated API calls
let cachedPartnerStatus: PartnerStatus | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCachedPartnerStatus = async (): Promise<PartnerStatus | null> => {
  const now = Date.now();
  
  // Return cached data if it's fresh enough
  if (cachedPartnerStatus && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedPartnerStatus;
  }
  
  // Otherwise fetch fresh data
  const status = await checkPartnerStatus();
  if (status) {
    cachedPartnerStatus = status;
    lastFetchTime = now;
  }
  
  return status;
};

export const clearPartnerStatusCache = (): void => {
  cachedPartnerStatus = null;
  lastFetchTime = 0;
};