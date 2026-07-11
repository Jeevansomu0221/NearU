import { Alert } from "react-native";

type DocumentPickerModule = typeof import("expo-document-picker");

let documentPickerModule: DocumentPickerModule | null = null;

const DEV_BUILD_MESSAGE =
  "Document upload needs a newer Vyaha Delivery build. Reinstall the latest development APK, or run: npm run build:android:development";

export async function getDocumentPicker(): Promise<DocumentPickerModule> {
  if (documentPickerModule) {
    return documentPickerModule;
  }

  try {
    documentPickerModule = await import("expo-document-picker");
    return documentPickerModule;
  } catch (error: any) {
    const message = error?.message || "";
    const isMissingNative =
      message.includes("ExpoDocumentPicker") || message.includes("Cannot find native module");

    Alert.alert(
      "Update required",
      isMissingNative ? DEV_BUILD_MESSAGE : message || "Could not open document picker."
    );
    throw error;
  }
}
