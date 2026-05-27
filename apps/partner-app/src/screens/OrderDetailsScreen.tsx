import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import api from "../api/client";
import { partnerTheme } from "../theme";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  status: string;
  createdAt: string;
  deliveryAddress: string;
  note: string;
  items: OrderItem[];
  customerId?: {
    name: string;
    phone: string;
  };
  deliveryPartnerId?: string | {
    name?: string;
    phone?: string;
    vehicleType?: string;
  };
  grandTotal: number;
  itemTotal: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

const getDeliveryPartnerName = (deliveryPartner: Order["deliveryPartnerId"]) => {
  if (!deliveryPartner) return "Not assigned yet";
  if (typeof deliveryPartner === "string") return "Assigned";

  const name = deliveryPartner.name?.trim();
  if (name) return name;

  const phone = deliveryPartner.phone?.trim();
  if (phone) return phone;

  return "Assigned";
};

type SwipeActionProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  accentColor: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
};

function SwipeAction({ title, subtitle, actionLabel, accentColor, onConfirm, disabled }: SwipeActionProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbSize = 56;
  const [fillWidth, setFillWidth] = useState(thumbSize + 16);
  const translateX = useRef(new Animated.Value(0)).current;

  const maxTranslate = Math.max(0, trackWidth - thumbSize - 16);

  const resetThumb = () => {
    setFillWidth(thumbSize + 16);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0
    }).start();
  };

  const confirmSwipe = async () => {
    if (disabled || !maxTranslate) return;

    setFillWidth(maxTranslate + thumbSize + 16);
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
        onStartShouldSetPanResponder: () => !disabled && maxTranslate > 0,
        onMoveShouldSetPanResponder: (_, gesture) => !disabled && maxTranslate > 0 && Math.abs(gesture.dx) > 6,
        onPanResponderMove: (_, gesture) => {
          if (disabled || !maxTranslate) return;
          const nextX = Math.max(0, Math.min(gesture.dx, maxTranslate));
          translateX.setValue(nextX);
          setFillWidth(nextX + thumbSize + 16);
        },
        onPanResponderRelease: (_, gesture) => {
          if (disabled || !maxTranslate) return;
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
    [disabled, maxTranslate, onConfirm]
  );

  return (
    <View style={styles.swipeActionCard}>
      <Text style={styles.swipeTitle}>{title}</Text>
      <Text style={styles.swipeSubtitle}>{subtitle}</Text>

      <View style={styles.swipeTrackWrap} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
        <View
          pointerEvents="none"
          style={[
            styles.swipeFill,
            {
              backgroundColor: accentColor,
              width: fillWidth
            }
          ]}
        />
        <View style={styles.swipeTrack}>
          <Text style={styles.swipeTrackHint}>{actionLabel}</Text>
        </View>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.swipeThumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderColor: accentColor,
              backgroundColor: accentColor,
              transform: [{ translateX }]
            }
          ]}
        >
          <Text style={styles.swipeThumbText}>›</Text>
        </Animated.View>
      </View>
      <Text style={[styles.swipeFooter, { color: accentColor }]}>Swipe all the way right to confirm</Text>
    </View>
  );
}

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const loadOrderDetails = async () => {
    try {
      const res = await api.get(`/orders/partner/${orderId}`);
      const response = res.data as ApiResponse<Order>;

      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        Alert.alert("Error", response.message || "Failed to load order details");
      }
    } catch (error: any) {
      console.error("Error loading order details:", error);
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
  };

  const performStatusUpdate = async (status: string) => {
    try {
      setUpdating(true);
      const res = await api.post(`/orders/partner/${orderId}/status`, { status });
      const response = res.data as ApiResponse<Order>;

      if (response.success) {
        setPendingStatus(null);
        await loadOrderDetails();
      } else {
        Alert.alert("Error", response.message || "Failed to update order");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update order status";
      if (status === "REJECTED" && String(message).includes("CANCELLED")) {
        setPendingStatus(null);
        await loadOrderDetails();
        Alert.alert(
          "Order cancelled",
          "This order is already cancelled. If online payment was done, the refund will be completed within today."
        );
        return;
      }

      console.error("Error updating order status:", error);
      Alert.alert("Error", message);
    } finally {
      setUpdating(false);
    }
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatus) return;
    await performStatusUpdate(pendingStatus);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "#FF9800";
      case "CONFIRMED":
        return "#2196F3";
      case "ACCEPTED":
        return "#00BCD4";
      case "PREPARING":
        return "#FF5722";
      case "READY":
        return "#9C27B0";
      case "ASSIGNED":
        return "#FF9800";
      case "PICKED_UP":
        return "#673AB7";
      case "DELIVERED":
        return "#4CAF50";
      case "CANCELLED":
        return "#F44336";
      case "REJECTED":
        return "#795548";
      default:
        return partnerTheme.colors.muted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Payment Pending";
      case "CONFIRMED":
        return "Order Placed";
      case "ACCEPTED":
        return "Accepted";
      case "PREPARING":
        return "Preparing Food";
      case "READY":
        return "Ready for Pickup";
      case "ASSIGNED":
        return "Delivery Assigned";
      case "PICKED_UP":
        return "Picked Up";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Cancelled";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "CASH_ON_DELIVERY":
        return "Pay on Delivery";
      case "UPI":
        return "UPI Payment";
      case "RAZORPAY":
        return "Online Payment";
      case "CARD":
        return "Card Payment";
      case "WALLET":
        return "Wallet Payment";
      default:
        return method;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Pending";
      case "PAYMENT_PENDING_DELIVERY":
        return "Collect on Delivery";
      case "PAID":
        return "Paid";
      case "FAILED":
        return "Failed";
      case "REFUNDED":
        return "Refunded";
      case "CANCELLED":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getPendingStatusTitle = () => {
    switch (pendingStatus) {
      case "ACCEPTED":
        return "Accept order";
      case "REJECTED":
        return "Reject order";
      default:
        return `Mark as ${pendingStatus?.replaceAll("_", " ").toLowerCase() || "updated"}`;
    }
  };

  const getPendingStatusText = () => {
    switch (pendingStatus) {
      case "ACCEPTED":
        return "The customer will see that your restaurant accepted the order.";
      case "REJECTED":
        return "The order will be marked as cancelled. The customer will see that any online payment refund will be completed within today.";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={partnerTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showAcceptButton = order.status === "CONFIRMED";
  const showRejectButton = order.status === "CONFIRMED";
  const showPreparingSwipe = order.status === "ACCEPTED";
  const showReadySwipe = order.status === "PREPARING";
  const isCancelledOrder = order.status === "CANCELLED" || order.status === "REJECTED";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[partnerTheme.colors.primary]} tintColor={partnerTheme.colors.primary} />}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {showRejectButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => setPendingStatus("REJECTED")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Reject Order</Text>
          </TouchableOpacity>
        )}

        {showAcceptButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => setPendingStatus("ACCEPTED")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>Accept Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {showPreparingSwipe ? (
        <View style={styles.section}>
          <SwipeAction
            title="Start preparation"
            subtitle="Swipe the handle to move this order into the kitchen queue."
            actionLabel="Swipe to start preparing"
            accentColor={partnerTheme.colors.warning}
            onConfirm={() => performStatusUpdate("PREPARING")}
            disabled={updating}
          />
        </View>
      ) : null}

      {showReadySwipe ? (
        <View style={styles.section}>
          <SwipeAction
            title="Mark ready"
            subtitle="Swipe once the order is packed and ready for handoff."
            actionLabel="Swipe to mark ready"
            accentColor={partnerTheme.colors.success}
            onConfirm={() => performStatusUpdate("READY")}
            disabled={updating}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parcel Handoff</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>#{order._id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Partner:</Text>
            <Text style={styles.infoValue}>{getDeliveryPartnerName(order.deliveryPartnerId)}</Text>
          </View>
          {order.note ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Packing Note:</Text>
              <Text style={styles.infoValue}>{order.note}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.infoCard}>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.quantity} x {item.name}
                </Text>
                <Text style={styles.itemPrice}>Rs {item.price} each</Text>
              </View>
              <Text style={styles.itemTotal}>Rs {item.price * item.quantity}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{getPaymentMethodText(order.paymentMethod)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <View
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor:
                    order.paymentStatus === "PAID"
                      ? "#4CAF50"
                      : order.paymentStatus === "PAYMENT_PENDING_DELIVERY" || order.paymentStatus === "PENDING"
                        ? "#FF9800"
                        : "#F44336"
                }
              ]}
            >
              <Text style={styles.paymentStatusText}>{getPaymentStatusText(order.paymentStatus)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.infoCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Total</Text>
            <Text style={styles.summaryValue}>Rs {order.itemTotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>Rs {order.deliveryFee || 49}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>Rs {order.grandTotal}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Timeline</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: getStatusColor("CONFIRMED") }]} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Order Placed</Text>
              <Text style={styles.timelineTime}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>

          {!isCancelledOrder && order.status !== "CONFIRMED" && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("ACCEPTED") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Accepted</Text>
                <Text style={styles.timelineTime}>-</Text>
              </View>
            </View>
          )}

          {isCancelledOrder && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("CANCELLED") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Cancelled</Text>
                <Text style={styles.timelineTime}>Refund will be completed within today if online payment was done.</Text>
              </View>
            </View>
          )}

          {["PREPARING", "READY", "ASSIGNED", "PICKED_UP", "DELIVERED"].includes(order.status) && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("PREPARING") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Food Preparation</Text>
                <Text style={styles.timelineTime}>-</Text>
              </View>
            </View>
          )}

          {["READY", "ASSIGNED", "PICKED_UP", "DELIVERED"].includes(order.status) && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("READY") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Ready for Pickup</Text>
                <Text style={styles.timelineTime}>-</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={Boolean(pendingStatus)} transparent animationType="fade" onRequestClose={() => !updating && setPendingStatus(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmEyebrow}>Order #{order._id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.confirmTitle}>{getPendingStatusTitle()}</Text>
            {getPendingStatusText() ? <Text style={styles.confirmText}>{getPendingStatusText()}</Text> : null}
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmSecondary} onPress={() => setPendingStatus(null)} disabled={updating}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmPrimary, pendingStatus === "REJECTED" && styles.confirmDanger]}
                onPress={confirmStatusUpdate}
                disabled={updating}
              >
                {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmPrimaryText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: partnerTheme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: partnerTheme.colors.background
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: partnerTheme.colors.muted
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: partnerTheme.colors.background
  },
  errorText: {
    fontSize: 18,
    color: partnerTheme.colors.danger,
    marginBottom: 20
  },
  backButton: {
    backgroundColor: partnerTheme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 16,
    fontWeight: "600"
  },
  header: {
    backgroundColor: partnerTheme.colors.card,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: partnerTheme.colors.border
  },
  orderId: {
    fontSize: 18,
    fontWeight: "700",
    color: partnerTheme.colors.primaryDark
  },
  orderDate: {
    fontSize: 14,
    color: partnerTheme.colors.muted,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    color: partnerTheme.colors.card,
    fontSize: 12,
    fontWeight: "600"
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: partnerTheme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: partnerTheme.colors.borderSoft,
    gap: 8
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    minWidth: 0
  },
  acceptButton: {
    backgroundColor: partnerTheme.colors.success
  },
  rejectButton: {
    backgroundColor: partnerTheme.colors.danger
  },
  actionButtonText: {
    color: partnerTheme.colors.card,
    fontSize: 14,
    fontWeight: "700"
  },
  section: {
    backgroundColor: partnerTheme.colors.background,
    padding: 16,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 12
  },
  infoCard: {
    backgroundColor: partnerTheme.colors.card,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    alignItems: "flex-start"
  },
  infoLabel: {
    fontSize: 14,
    color: partnerTheme.colors.muted,
    fontWeight: "500",
    flex: 1
  },
  infoValue: {
    fontSize: 14,
    color: partnerTheme.colors.primaryDark,
    flex: 2,
    textAlign: "right",
    lineHeight: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 16, 12, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  confirmCard: {
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: partnerTheme.colors.primary,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  confirmTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: partnerTheme.colors.primaryDark
  },
  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: partnerTheme.colors.muted
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  confirmSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: partnerTheme.colors.neutralSoft
  },
  confirmSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: partnerTheme.colors.muted
  },
  confirmPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: partnerTheme.colors.success
  },
  confirmDanger: {
    backgroundColor: partnerTheme.colors.danger
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: partnerTheme.colors.card
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: partnerTheme.colors.borderSoft
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 14,
    color: partnerTheme.colors.primaryDark,
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 13,
    color: partnerTheme.colors.muted
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "600",
    color: partnerTheme.colors.primaryDark
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  paymentStatusText: {
    color: partnerTheme.colors.card,
    fontSize: 12,
    fontWeight: "600"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 14,
    color: partnerTheme.colors.muted
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: partnerTheme.colors.primaryDark
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: partnerTheme.colors.borderSoft
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: partnerTheme.colors.primaryDark
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: partnerTheme.colors.primary
  },
  timeline: {
    marginTop: 8
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12
  },
  timelineContent: {
    flex: 1
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: partnerTheme.colors.primaryDark,
    marginBottom: 4
  },
  timelineTime: {
    fontSize: 12,
    color: partnerTheme.colors.muted
  },
  swipeActionCard: {
    backgroundColor: partnerTheme.colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 14
  },
  swipeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  swipeSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: partnerTheme.colors.muted,
    marginBottom: 12
  },
  swipeTrackWrap: {
    height: 72,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: partnerTheme.colors.surface,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    justifyContent: "center"
  },
  swipeFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 20
  },
  swipeTrack: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 70,
    paddingRight: 16
  },
  swipeTrackHint: {
    fontSize: 14,
    fontWeight: "800",
    color: partnerTheme.colors.primaryDark
  },
  swipeThumb: {
    position: "absolute",
    left: 8,
    top: 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: partnerTheme.colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1
  },
  swipeThumbText: {
    color: partnerTheme.colors.card,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "300"
  },
  swipeFooter: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "700"
  }
});
