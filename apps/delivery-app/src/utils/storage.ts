import AsyncStorage from "@react-native-async-storage/async-storage";

let memoryToken: string | null = null;

export const setToken = async (token: string) => {
  memoryToken = token;
  await AsyncStorage.setItem("token", token);
};

export const getToken = async (): Promise<string | null> => {
  if (memoryToken) return memoryToken;
  const token = await AsyncStorage.getItem("token");
  memoryToken = token;
  return token;
};

export const clearToken = async () => {
  memoryToken = null;
  await AsyncStorage.multiRemove(["token", "refreshToken", "user"]);
};
