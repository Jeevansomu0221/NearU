import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  orderId: string;
  itemCount: number;
  grandTotal: number;
  onOpen: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
};

export default function NewOrderBanner({
  visible,
  orderId,
  itemCount,
  grandTotal,
  onOpen,
  onDismiss,
  autoHideMs = 10000
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-220)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.timing(translateY, {
        toValue: -220,
        duration: 220,
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.spring(translateY, {
      toValue: 0,
      tension: 60,
      friction: 9,
      useNativeDriver: true
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    if (Platform.OS === "android") {
      Vibration.vibrate([0, 250, 150, 250, 150, 400]);
    } else {
      Vibration.vibrate();
    }

    const timer = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [visible, autoHideMs, onDismiss, translateY, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.wrapper,
        { paddingTop: insets.top + 8, transform: [{ translateY }] }
      ]}
    >
      <View style={styles.card}>
        <Animated.View style={[styles.iconBubble, { transform: [{ scale }] }]}>
          <Ionicons name="notifications" size={26} color="#FFFFFF" />
        </Animated.View>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>New order received</Text>
          <Text style={styles.title} numberOfLines={1}>
            #{orderId.slice(-6).toUpperCase()} - Rs {grandTotal}
          </Text>
          <Text style={styles.subtitle}>
            {itemCount} item{itemCount === 1 ? "" : "s"} waiting for your acceptance
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.openButton} onPress={onOpen} activeOpacity={0.85}>
            <Text style={styles.openButtonText}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.85}>
            <Ionicons name="close" size={20} color="#7B6D63" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 100,
    elevation: 12
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FFE0CC",
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12
      }
    })
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center"
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    minWidth: 0
  },
  eyebrow: {
    fontSize: 11,
    color: "#C4541C",
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 16,
    color: "#2C2018",
    fontWeight: "800",
    marginTop: 2
  },
  subtitle: {
    fontSize: 12,
    color: "#7B6D63",
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  openButton: {
    backgroundColor: "#143A66",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12
  },
  openButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  dismissButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5EFE7"
  }
});
