import AsyncStorage from "@react-native-async-storage/async-storage";

let memoryToken: string | null = null;

export const setToken = async (token: string) => {
  memoryToken = token;
  await AsyncStorage.setItem("token", token);
};

export const getToken = () => {
  return memoryToken;
};

export const clearToken = async () => {
  memoryToken = null;
  await AsyncStorage.removeItem("token");
};
