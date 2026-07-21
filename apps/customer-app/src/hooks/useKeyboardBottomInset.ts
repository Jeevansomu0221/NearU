import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Live keyboard height (useful for modal/sheets that do not resize with the window). */
export function useKeyboardBottomInset() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}

/**
 * Extra bottom inset for overlays/modals on Android.
 * Full screens use softwareKeyboardLayoutMode "resize" — do not add this there or the UI double-jumps.
 */
export function androidKeyboardPadding(keyboardHeight: number, options?: { forModal?: boolean }) {
  if (Platform.OS !== "android") return 0;
  if (!options?.forModal) return 0;
  return keyboardHeight;
}
