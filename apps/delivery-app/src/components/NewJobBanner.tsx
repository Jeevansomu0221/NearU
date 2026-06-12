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
import { formatAddress, type AddressLike } from "../utils/address";

type Job = {
  _id: string;
  grandTotal?: number;
  deliveryFee?: number;
  deliveryAddress?: string;
  paymentMethod?: string;
  distance?: number | null;
  travelTime?: number | null;
  estimatedEarnings?: number;
  partnerId?: {
    restaurantName?: string;
    shopName?: string;
    address?: AddressLike;
  };
  isBundledDelivery?: boolean;
  deliveryBundleSize?: number;
  pickupStops?: Array<{
    orderId: string;
    partnerId?: {
      restaurantName?: string;
      shopName?: string;
      address?: AddressLike;
    };
  }>;
  customerId?: {
    name?: string;
  };
};

type Props = {
  visible: boolean;
  job: Job | null;
  onOpen: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
};

export default function NewJobBanner({
  visible,
  job,
  onOpen,
  onAccept,
  onDismiss,
  autoHideMs = 15000
}: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-260)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !job) {
      Animated.timing(translateY, {
        toValue: -260,
        duration: 220,
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.spring(translateY, {
      toValue: 0,
      tension: 50,
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
  }, [visible, job, autoHideMs, onDismiss, translateY, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  if (!job) return null;

  const distanceText =
    typeof job.distance === "number" ? `${job.distance.toFixed(1)} km` : "Distance pending";
  const travelText = typeof job.travelTime === "number" ? `${Math.round(job.travelTime)} min` : "-- min";
  const earnings = job.estimatedEarnings || job.deliveryFee || 49;
  const restaurantName = job.isBundledDelivery
    ? `${job.pickupStops?.length || job.deliveryBundleSize || 2} restaurant pickups`
    : job.partnerId?.restaurantName || job.partnerId?.shopName || "Restaurant";
  const pickupAddress = job.isBundledDelivery
    ? "Open details for pickup sequence"
    : formatAddress(job.partnerId?.address, { short: true });
  const paymentLabel = job.paymentMethod === "CASH_ON_DELIVERY" ? "Cash on delivery" : "Pre-paid";

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.wrapper, { paddingTop: insets.top + 8, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Animated.View style={[styles.iconBubble, { transform: [{ scale }] }]}>
            <Ionicons name="bicycle" size={24} color="#FFFFFF" />
          </Animated.View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>New delivery job</Text>
            <Text style={styles.title} numberOfLines={1}>
              Rs {earnings} earnings - {distanceText}
            </Text>
            <Text style={styles.subtitle}>
              Order Rs {job.grandTotal || 0} - {paymentLabel}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss} accessibilityLabel="Dismiss">
            <Ionicons name="close" size={18} color="#667085" />
          </TouchableOpacity>
        </View>

        <View style={styles.routeRow}>
          <Ionicons name="storefront-outline" size={16} color="#2E7D32" />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeValue} numberOfLines={2}>
              {restaurantName} - {pickupAddress}
            </Text>
          </View>
        </View>
        <View style={styles.routeRow}>
          <Ionicons name="home-outline" size={16} color="#1565C0" />
          <View style={styles.routeText}>
            <Text style={styles.routeLabel}>Drop</Text>
            <Text style={styles.routeValue} numberOfLines={2}>
              {job.customerId?.name || "Customer"} - {formatAddress(job.deliveryAddress, { short: true })}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <Metric icon="speedometer-outline" label={distanceText} />
          <Metric icon="time-outline" label={travelText} />
          <Metric icon="cash-outline" label={`Rs ${earnings}`} />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.outlineButton} onPress={onOpen}>
            <Text style={styles.outlineButtonText}>View details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function Metric({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={14} color="#475467" />
      <Text style={styles.metricText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    zIndex: 100,
    elevation: 14
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "#D9F1DD",
    ...Platform.select({
      android: { elevation: 10 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14
      }
    })
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: "#2E7D32",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  title: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2
  },
  subtitle: {
    color: "#667085",
    fontSize: 12,
    marginTop: 2
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center"
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10
  },
  routeText: {
    flex: 1,
    minWidth: 0
  },
  routeLabel: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  routeValue: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12
  },
  metric: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  metricText: {
    color: "#475467",
    fontSize: 12,
    fontWeight: "700"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  outlineButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#F1F5F9"
  },
  outlineButtonText: {
    color: "#1F2937",
    fontSize: 13,
    fontWeight: "800"
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#4CAF50"
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  }
});
