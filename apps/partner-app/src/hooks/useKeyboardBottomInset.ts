import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  findNodeHandle,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  UIManager,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";

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

const measureInWindow = (
  node: Parameters<typeof findNodeHandle>[0],
  callback: (x: number, y: number, width: number, height: number) => void
) => {
  const host = node as { measureInWindow?: typeof callback };
  if (typeof host?.measureInWindow === "function") {
    host.measureInWindow(callback);
    return;
  }
  const handle = findNodeHandle(node);
  if (handle) {
    UIManager.measureInWindow(handle, callback);
  }
};

/** Keeps the focused text field above the keyboard while typing. */
export function useScrollToFocusedInput(extraGap = 28) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  const revealFocusedInput = useCallback(
    (keyboardHeightOverride?: number) => {
      const keyboardHeight = keyboardHeightOverride ?? keyboardHeightRef.current;
      const scroll = scrollRef.current;
      const input = TextInput.State.currentlyFocusedInput?.();
      if (!scroll || !input || keyboardHeight <= 0) return;

      const run = () => {
        measureInWindow(input, (_x, y, _width, height) => {
          const visibleBottom = Dimensions.get("window").height - keyboardHeight - extraGap;
          const overlap = y + height - visibleBottom;
          if (overlap > 0) {
            scroll.scrollTo({
              y: Math.max(0, scrollYRef.current + overlap),
              animated: true
            });
          }
        });
      };

      requestAnimationFrame(() => {
        setTimeout(run, 60);
      });
    },
    [extraGap]
  );

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;
      revealFocusedInput(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [revealFocusedInput]);

  return {
    scrollRef,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    onInputFocus: () => revealFocusedInput()
  };
}
