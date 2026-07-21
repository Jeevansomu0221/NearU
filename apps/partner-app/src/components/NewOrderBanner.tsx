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
  items?: Array<{
    name: string;
    quantity: number;
    cookingRequest?: string;
  }>;
  grandTotal: number;
  onOpen: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
};

export default function NewOrderBanner({
  visible,
  orderId,
  itemCount,
  items = [],
  grandTotal,
  onOpen,
  onAccept,
  onReject,
  onDismiss,
  autoHideMs = 20000
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
        <View style={styles.topRow}>
          <Animated.View style={[styles.iconBubble, { transform: [{ scale }] }]}>
            <Ionicons name="notifications" size={26} color="#FFFFFF" />
          </Animated.View>
          <View style={styles.body}>
            <Text style={styles.eyebrow}>New order received</Text>
            <Text style={styles.title} numberOfLines={1}>
              #{orderId.slice(-6).toUpperCase()} - Rs {grandTotal}
            </Text>
          <Text style={styles.subtitle}>
            {itemCount} item{itemCount === 1 ? "" : "s"} waiting for accept / reject
          </Text>
          {items.length > 0 ? (
            <View style={styles.itemsWrap}>
              {items.map((item) => (
                <View key={`${orderId}-${item.name}-${item.cookingRequest || ""}`} style={styles.itemChip}>
                  <Text style={styles.itemChipText} numberOfLines={2}>
                    {item.quantity} x {item.name}
                    {item.cookingRequest?.trim() ? `\nCooking: ${item.cookingRequest.trim()}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss} activeOpacity={0.85}>
            <Ionicons name="close" size={20} color="#7B6D63" />
          </TouchableOpacity>
        </View>
        <View style={styles.actionButtonsRow}>
          {onReject ? (
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={onReject} activeOpacity={0.85}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.actionButton, styles.openButton]} onPress={onAccept || onOpen} activeOpacity={0.85}>
            <Text style={styles.openButtonText}>{onAccept ? "Accept" : "Open"}</Text>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center"
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
  itemsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  itemChip: {
    backgroundColor: "#F4F8FF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  itemChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#143A66"
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  rejectButton: {
    backgroundColor: "#FFF1F1",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD1D1"
  },
  rejectButtonText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "900"
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
