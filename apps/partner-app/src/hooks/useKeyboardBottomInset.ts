import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/** Live keyboard height for padding fields above the soft keyboard (esp. Android + edge-to-edge). */
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

/** Extra bottom padding to apply on Android when the keyboard is open. iOS relies on KeyboardAvoidingView. */
export function androidKeyboardPadding(keyboardHeight: number) {
  return Platform.OS === "android" ? keyboardHeight : 0;
}
