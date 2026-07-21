import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  TouchableOpacity,
  RefreshControl,
  Linking,
  TextInput
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cancelOrder, getOrderDetails, submitOrderRating } from "../api/order.api";
import type { Order } from "../api/order.api";
import { getPublicShopName } from "../utils/display";
import KeyboardSafeScreen from "../components/KeyboardSafeScreen";

type TimelineStep = {
  status: string;
  label: string;
  caption: string;
};


const STATUS_STEPS: TimelineStep[] = [
  { status: "CONFIRMED", label: "Order placed", caption: "Waiting for restaurant confirmation" },
  { status: "ACCEPTED", label: "Restaurant confirmed", caption: "Restaurant accepted your order" },
  { status: "PREPARING", label: "Preparing", caption: "Food is getting ready" },
  { status: "READY", label: "Ready", caption: "Packed and ready for pickup" },
  { status: "ASSIGNED", label: "Assigned", caption: "Delivery partner assigned" },
  { status: "PICKED_UP", label: "On the way", caption: "Your order is on the road" },
  { status: "DELIVERED", label: "Delivered", caption: "Order completed successfully" }
];

const formatAmount = (value = 0) => {
  const rounded = Number(value || 0).toFixed(2).replace(/\.?0+$/, "");
  return `Rs ${rounded || "0"}`;
};

const CANCELLABLE_ORDER_STATUSES = new Set(["PENDING", "CONFIRMED"]);

export default function OrderStatusScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [overallRating, setOverallRating] = useState(0);
  const [restaurantComment, setRestaurantComment] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const reviewOffsetY = useRef(0);

  const scrollReviewIntoView = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, reviewOffsetY.current - 16),
        animated: true
      });
    }, 80);
  }, []);

  const loadOrderDetails = useCallback(async (options?: { silent?: boolean }) => {
    try {
      const response = await getOrderDetails(orderId);

      if (response.success && response.data) {
        setOrder(response.data);
      } else if (!options?.silent) {
        Alert.alert("Error", response.message || "Failed to load order details");
      }
    } catch (error) {
      console.error("Error loading order:", error);
      if (!options?.silent) {
        Alert.alert("Error", "Failed to load order details");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetails();

    const interval = setInterval(() => {
      loadOrderDetails({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, [loadOrderDetails]);

  useEffect(() => {
    if (!order?.ratingSubmittedAt) return;

    setOverallRating(order.restaurantRating?.overallExperience || 0);
    setRestaurantComment(order.restaurantRating?.comment || "");
  }, [order]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        navigation.reset({ index: 0, routes: [{ name: "Home" }] });
        return true;
      });

      return () => subscription.remove();
    }, [navigation])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
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

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return { bg: "#DDF8E5", text: "#216E39", pill: "#216E39" };
      case "CONFIRMED":
      case "ACCEPTED":
      case "ASSIGNED":
      case "PICKED_UP":
        return { bg: "#E8F1FF", text: "#225EA8", pill: "#225EA8" };
      case "PREPARING":
      case "READY":
      case "PENDING":
        return { bg: "#FFF2D9", text: "#A15C00", pill: "#F29F05" };
      case "CANCELLED":
      case "REJECTED":
        return { bg: "#FDE7E7", text: "#B42318", pill: "#B42318" };
      default:
        return { bg: "#EFE8E1", text: "#6B5E55", pill: "#6B5E55" };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Payment pending";
      case "CONFIRMED":
        return "Order placed";
      case "ACCEPTED":
        return "Restaurant confirmed";
      case "PREPARING":
        return "Preparing your food";
      case "READY":
        return "Ready for pickup";
      case "ASSIGNED":
        return "Delivery partner assigned";
      case "PICKED_UP":
        return "On the way";
      case "DELIVERED":
        return "Delivered";
      case "CANCELLED":
        return "Order cancelled";
      case "REJECTED":
        return "Rejected by restaurant";
      default:
        return status;
    }
  };

  const getPaymentStatusText = (status?: string) => {
    switch (status) {
      case "PAID":
        return "Paid";
      case "FAILED":
        return "Failed";
      case "REFUNDED":
        return "Refunded";
      case "PENDING":
      case "PAYMENT_PENDING_DELIVERY":
      default:
        return "Pending";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Your order is waiting for payment confirmation.";
      case "CONFIRMED":
        return "Your order has been placed. The restaurant will confirm it shortly.";
      case "ACCEPTED":
        return "The restaurant has confirmed your order and will start preparing it.";
      case "PREPARING":
        return "Your items are being prepared now.";
      case "READY":
        return "Everything is packed and waiting for pickup.";
      case "ASSIGNED":
        return "A delivery partner has been assigned to your order.";
      case "PICKED_UP":
        return "Your order has been picked up and is on the way to you.";
      case "DELIVERED":
        return "Your order was delivered successfully.";
      case "CANCELLED":
        return order?.customerCancellationMessage || "This order has been cancelled.";
      case "REJECTED":
        return "The restaurant could not accept this order.";
      default:
        return "Tracking updates will appear here.";
    }
  };

  const currentStep = useMemo(() => {
    if (!order) return -1;

    if (order.status === "CANCELLED" || order.status === "REJECTED") {
      return -2;
    }

    if (order.status === "PENDING") {
      return -1;
    }

    return STATUS_STEPS.findIndex((step) => step.status === order.status);
  }, [order]);

  const canCancelOrder = Boolean(order && CANCELLABLE_ORDER_STATUSES.has(order.status));

  const openPhone = async (phone?: string) => {
    if (!phone) return;

    const phoneUrl = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert("Error", "Phone calls are not supported on this device");
      }
    } catch (error) {
      console.error("Error opening phone dialer:", error);
      Alert.alert("Error", "Unable to open the dialer");
    }
  };

  const confirmCancelOrder = () => {
    if (!order || !canCancelOrder || cancelling) return;

    Alert.alert(
      "Cancel order?",
      "You can cancel only before the restaurant confirms the order. Once cancelled, this order cannot be restored.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              setCancelling(true);
              const response = await cancelOrder(order._id);
              if (!response.success) {
                throw new Error(response.message || "Failed to cancel order");
              }

              setOrder(response.data || { ...order, status: "CANCELLED", paymentStatus: "CANCELLED" });
              Alert.alert("Order Cancelled", "Your order has been cancelled.");
            } catch (error: any) {
              Alert.alert(
                "Could not cancel order",
                error?.message || "This order can only be cancelled before the restaurant confirms it."
              );
              loadOrderDetails({ silent: true });
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const canSubmitRatings = overallRating >= 1 && overallRating <= 5;

  const handleSubmitRatings = async () => {
    if (!order || ratingSubmitting) return;

    if (!canSubmitRatings) {
      Alert.alert("Review", "Please select a star rating before submitting.");
      return;
    }

    try {
      setRatingSubmitting(true);
      const response = await submitOrderRating(order._id, {
        overallRating,
        comment: restaurantComment.trim(),
        restaurantRating: {
          foodQuality: overallRating,
          packaging: overallRating,
          overallExperience: overallRating,
          comment: restaurantComment.trim()
        }
      });

      if (!response.success || !response.data) {
        Alert.alert("Ratings", response.message || "Failed to submit ratings");
        return;
      }

      setOrder(response.data);
      Alert.alert("Thank you", "Your ratings have been submitted.");
    } catch (error: any) {
      Alert.alert("Ratings", error?.message || "Failed to submit ratings");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (nextValue: number) => void, disabled = false) => (
    <View style={styles.ratingStars}>
      {[1, 2, 3, 4, 5].map((score) => (
        <TouchableOpacity
          key={score}
          onPress={() => onChange(score)}
          disabled={disabled}
          style={styles.ratingStarButton}
        >
          <MaterialCommunityIcons
            name={score <= value ? "star" : "star-outline"}
            size={26}
            color={score <= value ? "#F59E0B" : "#D0C5BA"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Order not found</Text>
        <Text style={styles.errorText}>We could not load this order right now.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusTheme = getStatusTheme(order.status);
  const isClosedOrder = order.status === "CANCELLED" || order.status === "REJECTED";
  const restaurantName =
    getPublicShopName((order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant");
  const deliveryPartner = order.deliveryPartnerId as any;
  const itemTotal = order.itemTotal || 0;
  const deliveryFee = order.deliveryFee || 0;
  const foodGst = order.foodGst ?? itemTotal * 0.05;
  const deliveryGst = order.deliveryGst ?? deliveryFee * 0.18;
  const platformFee = order.platformFee ?? 0;
  const taxDiscount = order.taxDiscount ?? foodGst + deliveryGst + platformFee;
  const hasSubmittedRating = Boolean(order.ratingSubmittedAt);
  const canRateOrder = order.status === "DELIVERED";

  return (
    <KeyboardSafeScreen
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={{ paddingTop: 14 }}
      bottomPadding={40}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B35"]} />}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.orderEyebrow}>Order #{order._id.slice(-6)}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusTheme.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusTheme.text }]}>{getStatusText(order.status)}</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>{restaurantName}</Text>
        <Text style={styles.heroSubtitle}>{getStatusDescription(order.status)}</Text>

        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{formatAmount(order.grandTotal || 0)}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Payment</Text>
            <Text style={styles.statValue}>
              {order.paymentMethod === "CASH_ON_DELIVERY"
                ? "COD"
                : order.paymentMethod === "UPI"
                  ? "UPI"
                  : order.paymentMethod || "Online"}
            </Text>
          </View>
        </View>
      </View>

      {!isClosedOrder ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Live status</Text>
          <View style={styles.timeline}>
            {STATUS_STEPS.map((step, index) => {
              const isComplete = index < currentStep;
              const isActive = index === currentStep;
              const isPending = index > currentStep;

              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        isComplete && styles.timelineDotComplete,
                        isActive && styles.timelineDotActive,
                        isPending && styles.timelineDotPending
                      ]}
                    />
                    {index < STATUS_STEPS.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          index < currentStep ? styles.timelineLineActive : styles.timelineLineInactive
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        (isComplete || isActive) && styles.timelineLabelActive
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.timelineCaption}>
                      {isActive ? "Current step" : isComplete ? "Completed" : step.caption}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={[styles.sectionCard, styles.alertCard, { backgroundColor: statusTheme.bg }]}>
          <Text style={[styles.alertTitle, { color: statusTheme.text }]}>{getStatusText(order.status)}</Text>
          <Text style={[styles.alertText, { color: statusTheme.text }]}>{getStatusDescription(order.status)}</Text>
          {order.cancellationReason ? (
            <Text style={[styles.alertText, { color: statusTheme.text, marginTop: 8 }]}>
              Reason: {order.cancellationReason}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.contactCard}>
          {deliveryPartner ? (
            <View style={styles.contactRow}>
              <View style={styles.contactCopy}>
                <Text style={styles.contactTitle}>Delivery partner</Text>
                <Text style={styles.contactValue}>{deliveryPartner?.name || "Assigned"}</Text>
                {deliveryPartner?.phone ? <Text style={styles.contactMeta}>{deliveryPartner.phone}</Text> : null}
              </View>
              {deliveryPartner?.phone ? (
                <TouchableOpacity style={styles.secondaryButton} onPress={() => openPhone(deliveryPartner.phone)}>
                  <Text style={styles.secondaryButtonText}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.contactRow}>
              <View style={styles.contactCopy}>
                <Text style={styles.contactTitle}>Delivery partner</Text>
                <Text style={styles.contactValue}>Not assigned yet</Text>
                <Text style={styles.contactMeta}>Phone number will appear after assignment.</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Delivery details</Text>
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{order.deliveryAddress || "No address provided"}</Text>
        </View>
        {order.note ? (
          <View style={[styles.detailBlock, styles.detailDivider]}>
            <Text style={styles.detailLabel}>Special instructions</Text>
            <Text style={styles.detailValue}>{order.note}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items?.map((item: any, index: number) => (
          <View
            key={`${item.name}-${index}`}
            style={[styles.itemRow, index > 0 && styles.itemDivider]}
          >
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.quantity} x {item.name}</Text>
              <Text style={styles.itemMeta}>{formatAmount(item.price)} each</Text>
            </View>
            <Text style={styles.itemTotal}>{formatAmount(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Item total</Text>
          <Text style={styles.summaryValue}>{formatAmount(itemTotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee {order.deliveryDistanceKm ? `(${order.deliveryDistanceKm} km)` : ""}</Text>
          <Text style={styles.summaryValue}>{formatAmount(deliveryFee)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Food GST (5%)</Text>
          <View style={styles.waivedValueGroup}>
            <Text style={styles.struckValue}>{formatAmount(foodGst)}</Text>
            <Text style={styles.freeValue}>Rs 0</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery GST (18%)</Text>
          <View style={styles.waivedValueGroup}>
            <Text style={styles.struckValue}>{formatAmount(deliveryGst)}</Text>
            <Text style={styles.freeValue}>Rs 0</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Platform fee</Text>
          <View style={styles.waivedValueGroup}>
            <Text style={styles.struckValue}>{formatAmount(platformFee)}</Text>
            <Text style={styles.freeValue}>Rs 0</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Payment status</Text>
          <Text style={[styles.summaryValue, { color: statusTheme.pill }]}>
            {getPaymentStatusText(order.paymentStatus)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Grand total</Text>
          <Text style={styles.totalValue}>{formatAmount(order.grandTotal || 0)}</Text>
        </View>
        <Text style={styles.offerNote}>You saved {formatAmount(taxDiscount)} with waived GST and platform fee.</Text>
      </View>

      {canRateOrder ? (
        <View
          style={styles.sectionCard}
          onLayout={(event) => {
            reviewOffsetY.current = event.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionTitle}>Rate your order</Text>
          {hasSubmittedRating ? (
            <View>
              <Text style={styles.ratingSubmittedText}>Thanks for your review.</Text>
              <View style={styles.ratingRowBlock}>
                <Text style={styles.ratingLabel}>Your rating</Text>
                {renderStars(overallRating, () => {}, true)}
              </View>
              {restaurantComment ? (
                <Text style={styles.submittedReviewComment}>{restaurantComment}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <Text style={styles.ratingHint}>Share a star rating and optional feedback for this restaurant.</Text>
              <View style={styles.ratingRowBlock}>
                <Text style={styles.ratingLabel}>Overall rating</Text>
                {renderStars(overallRating, setOverallRating)}
              </View>
              <TextInput
                style={styles.ratingCommentInput}
                value={restaurantComment}
                onChangeText={setRestaurantComment}
                multiline
                placeholder="Anything else to say? (optional)"
                placeholderTextColor="#A3968D"
                onFocus={scrollReviewIntoView}
              />
              <TouchableOpacity
                style={[styles.primaryButton, (!canSubmitRatings || ratingSubmitting) && styles.primaryButtonDisabled]}
                onPress={handleSubmitRatings}
                disabled={!canSubmitRatings || ratingSubmitting}
              >
                {ratingSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}

      {canCancelOrder ? (
        <View style={[styles.sectionCard, styles.cancelCard]}>
          <Text style={styles.cancelTitle}>Need to cancel?</Text>
          <Text style={styles.cancelText}>
            You can cancel this order only before the restaurant confirms it.
          </Text>
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
            onPress={confirmCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#B42318" />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>Need help with this order?</Text>
        <Text style={styles.supportText}>
          Pull to refresh for live updates, or open your orders list to check other restaurant orders.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Orders")}>
          <Text style={styles.primaryButtonText}>View All Orders</Text>
        </TouchableOpacity>
      </View>
    </KeyboardSafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F3EE"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B5E55"
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F3EE",
    padding: 24
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  errorText: {
    fontSize: 14,
    color: "#7B6D63",
    marginBottom: 18,
    textAlign: "center"
  },
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA"
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14
  },
  orderEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#8B6A54",
    marginBottom: 4
  },
  orderDate: {
    fontSize: 12,
    color: "#7B6D63"
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800"
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55"
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 16
  },
  statPill: {
    flex: 1,
    backgroundColor: "#FFF8F1",
    borderRadius: 16,
    padding: 12,
    marginRight: 10
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 4
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018"
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE5DA"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 14
  },
  cancelCard: {
    backgroundColor: "#FFF8F4",
    borderColor: "#FFD7C3"
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  cancelText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7B6D63",
    marginBottom: 12
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#F5B4AE",
    backgroundColor: "#FFF1F0",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center"
  },
  cancelButtonDisabled: {
    opacity: 0.65
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#B42318"
  },
  timeline: {
    paddingTop: 2
  },
  timelineRow: {
    flexDirection: "row"
  },
  timelineRail: {
    width: 28,
    alignItems: "center"
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 3,
    zIndex: 1
  },
  timelineDotComplete: {
    backgroundColor: "#FF6B35"
  },
  timelineDotActive: {
    backgroundColor: "#FF6B35",
    borderWidth: 3,
    borderColor: "#FFD8C8"
  },
  timelineDotPending: {
    backgroundColor: "#E8DDD2"
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4
  },
  timelineLineActive: {
    backgroundColor: "#FF6B35"
  },
  timelineLineInactive: {
    backgroundColor: "#E8DDD2"
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 18,
    paddingLeft: 8
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8B7A70"
  },
  timelineLabelActive: {
    color: "#2C2018"
  },
  timelineCaption: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: "#7B6D63"
  },
  alertCard: {
    borderColor: "transparent"
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19
  },
  contactCard: {
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#F2E7DB",
    borderRadius: 18,
    padding: 14
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  contactDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0E5D9"
  },
  contactCopy: {
    flex: 1,
    marginRight: 12
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 4
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2C2018"
  },
  contactMeta: {
    marginTop: 3,
    fontSize: 12,
    color: "#7B6D63"
  },
  detailBlock: {
    paddingVertical: 2
  },
  detailDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1E7DD",
    marginTop: 12,
    paddingTop: 12
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6A54",
    marginBottom: 6
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#2C2018"
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 10
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F1E7DD"
  },
  itemCopy: {
    flex: 1,
    marginRight: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2018",
    marginBottom: 4
  },
  itemMeta: {
    fontSize: 12,
    color: "#7B6D63"
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2C2018"
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  summaryLabel: {
    fontSize: 13,
    color: "#7B6D63"
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  waivedValueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  struckValue: {
    fontSize: 12,
    color: "#9A8A7F",
    textDecorationLine: "line-through"
  },
  freeValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#216E39"
  },
  offerNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#216E39",
    fontWeight: "700"
  },
  ratingHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55",
    marginBottom: 14
  },
  ratingSubmittedText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#216E39",
    fontWeight: "700",
    marginBottom: 14
  },
  submittedReviewComment: {
    fontSize: 13,
    lineHeight: 20,
    color: "#5C524B",
    marginTop: 4
  },
  ratingGroup: {
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#F2E7DB",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12
  },
  ratingGroupTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2C2018",
    marginBottom: 10
  },
  ratingRowBlock: {
    marginBottom: 12
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B5E55",
    marginBottom: 6
  },
  ratingStars: {
    flexDirection: "row",
    alignItems: "center"
  },
  ratingStarButton: {
    paddingRight: 4,
    paddingVertical: 2
  },
  ratingCommentInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#E6D8CB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#2C2018",
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1E7DD"
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FF6B35"
  },
  supportCard: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#FFF0E6",
    borderWidth: 1,
    borderColor: "#F3D7C6"
  },
  supportTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  supportText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55",
    marginBottom: 14
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center"
  },
  primaryButtonDisabled: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: "#FDE9DE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#C4541C"
  }
});
