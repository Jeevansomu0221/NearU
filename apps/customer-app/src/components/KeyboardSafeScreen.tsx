import React, { forwardRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { androidKeyboardPadding, useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";

type Props = ScrollViewProps & {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Base bottom padding when the keyboard is closed. */
  bottomPadding?: number;
  keyboardVerticalOffset?: number;
};

/**
 * Full-screen scroll form that keeps focused inputs above the keyboard on iOS and Android.
 */
const KeyboardSafeScreen = forwardRef<ScrollView, Props>(function KeyboardSafeScreen(
  {
    style,
    contentContainerStyle,
    bottomPadding = 24,
    keyboardVerticalOffset = Platform.OS === "ios" ? 0 : 0,
    children,
    ...scrollProps
  },
  ref
) {
  const keyboardHeight = useKeyboardBottomInset();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={ref}
        style={styles.flex}
        contentContainerStyle={[
          contentContainerStyle,
          { paddingBottom: bottomPadding + androidKeyboardPadding(keyboardHeight) }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 }
});

export default KeyboardSafeScreen;
