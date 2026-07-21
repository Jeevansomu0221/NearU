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

type Props = ScrollViewProps & {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Base bottom padding when the keyboard is closed. */
  bottomPadding?: number;
  keyboardVerticalOffset?: number;
};

/**
 * Full-screen scroll form. Relies on Android window resize + iOS KeyboardAvoidingView
 * so focused fields stay visible without overshooting downward.
 */
const KeyboardSafeScreen = forwardRef<ScrollView, Props>(function KeyboardSafeScreen(
  {
    style,
    contentContainerStyle,
    bottomPadding = 24,
    keyboardVerticalOffset = 0,
    children,
    ...scrollProps
  },
  ref
) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={ref}
        style={styles.flex}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
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
