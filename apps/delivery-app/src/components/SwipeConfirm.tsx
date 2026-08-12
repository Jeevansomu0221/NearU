import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  ActivityIndicator
} from "react-native";

type SwipeConfirmProps = {
  actionLabel: string;
  accentColor?: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

export default function SwipeConfirm({
  actionLabel,
  accentColor = "#22C55E",
  onConfirm,
  disabled = false,
  loading = false
}: SwipeConfirmProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = 52;
  const horizontalPad = 6;
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslate = Math.max(0, trackWidth - thumbSize - horizontalPad * 2);
  const isDisabled = disabled || loading;
  const progressEnd = Math.max(maxTranslate, 1);

  const fillWidth = translateX.interpolate({
    inputRange: [0, progressEnd],
    outputRange: [thumbSize + horizontalPad * 2, Math.max(trackWidth, thumbSize + horizontalPad * 2)],
    extrapolate: "clamp"
  });

  const emptyLabelOpacity = translateX.interpolate({
    inputRange: [0, progressEnd * 0.35, progressEnd * 0.55],
    outputRange: [1, 0.45, 0],
    extrapolate: "clamp"
  });

  const filledLabelOpacity = translateX.interpolate({
    inputRange: [0, progressEnd * 0.35, progressEnd * 0.55],
    outputRange: [0, 0.55, 1],
    extrapolate: "clamp"
  });

  const resetThumb = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 0
    }).start();
  };

  const confirmSwipe = async () => {
    if (isDisabled || !maxTranslate) return;

    Animated.timing(translateX, {
      toValue: maxTranslate,
      duration: 160,
      useNativeDriver: false
    }).start(async () => {
      try {
        await onConfirm();
      } finally {
        resetThumb();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isDisabled && maxTranslate > 0,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isDisabled && maxTranslate > 0 && Math.abs(gesture.dx) > 6,
        onPanResponderMove: (_, gesture) => {
          if (isDisabled || !maxTranslate) return;
          const nextX = Math.max(0, Math.min(gesture.dx, maxTranslate));
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          if (isDisabled || !maxTranslate) return;
          const shouldConfirm = gesture.dx > maxTranslate * 0.7;
          if (shouldConfirm) {
            void confirmSwipe();
          } else {
            resetThumb();
          }
        },
        onPanResponderTerminate: () => {
          resetThumb();
        }
      }),
    [isDisabled, maxTranslate, onConfirm]
  );

  return (
    <View
      style={[
        styles.trackWrap,
        {
          borderColor: accentColor,
          backgroundColor: "#F8FAFC",
          opacity: isDisabled && !loading ? 0.55 : 1
        }
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <View pointerEvents="none" style={[styles.trackTint, { backgroundColor: accentColor }]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            backgroundColor: accentColor,
            width: fillWidth
          }
        ]}
      />
      <View style={styles.track}>
        {loading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <View style={styles.labelStack}>
            <Animated.Text style={[styles.trackHint, { color: accentColor, opacity: emptyLabelOpacity }]}>
              {actionLabel}
            </Animated.Text>
            <Animated.Text style={[styles.trackHint, styles.trackHintFilled, { opacity: filledLabelOpacity }]}>
              {actionLabel}
            </Animated.Text>
          </View>
        )}
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            left: horizontalPad,
            top: horizontalPad,
            transform: [{ translateX }]
          }
        ]}
      >
        <Text style={[styles.thumbText, { color: accentColor }]}>{">>"}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackWrap: {
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    justifyContent: "center",
    borderWidth: 1.5
  },
  trackTint: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32
  },
  track: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 72,
    zIndex: 1
  },
  labelStack: {
    minHeight: 22,
    justifyContent: "center",
    alignItems: "center"
  },
  trackHint: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  },
  trackHintFilled: {
    position: "absolute",
    color: "#FFFFFF"
  },
  thumb: {
    position: "absolute",
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 2
  },
  thumbText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -2
  }
});
