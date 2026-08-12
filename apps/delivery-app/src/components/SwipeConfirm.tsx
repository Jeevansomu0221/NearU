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
  const [fillWidth, setFillWidth] = useState(thumbSize + 12);
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslate = Math.max(0, trackWidth - thumbSize - 12);
  const isDisabled = disabled || loading;

  const resetThumb = () => {
    setFillWidth(thumbSize + 12);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0
    }).start();
  };

  const confirmSwipe = async () => {
    if (isDisabled || !maxTranslate) return;

    setFillWidth(maxTranslate + thumbSize + 12);
    Animated.timing(translateX, {
      toValue: maxTranslate,
      duration: 160,
      useNativeDriver: true
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
          setFillWidth(nextX + thumbSize + 12);
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
      style={[styles.trackWrap, { backgroundColor: accentColor }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            backgroundColor: "rgba(255,255,255,0.18)",
            width: fillWidth
          }
        ]}
      />
      <View style={styles.track}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.trackHint}>{actionLabel}</Text>
        )}
      </View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
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
    justifyContent: "center"
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
    paddingHorizontal: 72
  },
  trackHint: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  thumb: {
    position: "absolute",
    left: 6,
    top: 6,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3
  },
  thumbText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -2
  }
});
