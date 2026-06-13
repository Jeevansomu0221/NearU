import AsyncStorage from "@react-native-async-storage/async-storage";

const VEG_MODE_STORAGE_KEY = "customer:vegMode";

export const getVegModePreference = async () => {
  try {
    return (await AsyncStorage.getItem(VEG_MODE_STORAGE_KEY)) === "true";
  } catch {
    return false;
  }
};

export const setVegModePreference = async (enabled: boolean) => {
  await AsyncStorage.setItem(VEG_MODE_STORAGE_KEY, String(enabled));
};
