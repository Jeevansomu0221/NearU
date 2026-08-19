import AsyncStorage from "@react-native-async-storage/async-storage";

export type PartnerActorType = "owner" | "staff";

export type StoredPartnerUser = {
  id?: string;
  name?: string;
  phone?: string;
  username?: string;
  actorType?: PartnerActorType;
  operatorName?: string;
  staffId?: string;
  partnerId?: string;
  restaurantName?: string;
};

export const getStoredPartnerUser = async (): Promise<StoredPartnerUser | null> => {
  try {
    const raw = await AsyncStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredPartnerUser;
  } catch {
    return null;
  }
};

export const isStaffActor = (user?: StoredPartnerUser | null) => user?.actorType === "staff";
