// apps/customer-app/src/utils/storage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

let memoryToken: string | null = null;

export const setToken = async (token: string) => {
  memoryToken = token;
  await AsyncStorage.setItem("token", token);
};

// FIX: Get token from AsyncStorage if memoryToken is null
export const getToken = async (): Promise<string | null> => {
  if (memoryToken) {
    return memoryToken;
  }
  
  try {
    const token = await AsyncStorage.getItem("token");
    memoryToken = token;
    return token;
  } catch (error) {
    console.error("Error getting token from storage:", error);
    return null;
  }
};

export const removeToken = async () => {
  memoryToken = null;
  await AsyncStorage.removeItem("token");
};

export const clearStorage = async () => {
  memoryToken = null;
  await AsyncStorage.clear();
};