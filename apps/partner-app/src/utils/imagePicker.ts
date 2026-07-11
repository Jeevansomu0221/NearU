import { Alert } from "react-native";

type ImagePickerModule = typeof import("expo-image-picker");

let imagePickerModule: ImagePickerModule | null = null;

const DEV_BUILD_MESSAGE =
  "Photo upload needs a newer Vyaha Partner build. Reinstall the latest development APK from your team, or run a fresh EAS development build.";

export async function getImagePicker(): Promise<ImagePickerModule> {
  if (imagePickerModule) {
    return imagePickerModule;
  }

  try {
    imagePickerModule = await import("expo-image-picker");
    return imagePickerModule;
  } catch (error: any) {
    const message = error?.message || "";
    const isMissingNative =
      message.includes("ExponentImagePicker") || message.includes("Cannot find native module");

    Alert.alert("Update required", isMissingNative ? DEV_BUILD_MESSAGE : message || "Could not open image picker.");
    throw error;
  }
}
