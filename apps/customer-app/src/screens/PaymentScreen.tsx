import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RazorpayCheckout from "react-native-razorpay";
import { useCart } from "../context/CartContext";
import { createShopOrder } from "../api/order.api";
import { createRazorpayOrder, verifyPayment } from "../api/payment.api";
import SuccessCelebration from "../components/SuccessCelebration";

interface CheckoutGroup {
  shopId: string;
  shopName: string;
  items: Array<{
    _id?: string;
    name: string;
    price: number;
    quantity: number;
    menuItemId?: string;
  }>;
  subtotal: number;
}

export default function PaymentScreen({ route, navigation }: any) {
  const { userProfile, orderSummary } = route.params;
  const { items, clear } = useCart();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [successOrders, setSuccessOrders] = useState<any[] | null>(null);

  const paymentMethods = [
    { id: "CASH_ON_DELIVERY", name: "Pay on Delivery", icon: "Cash" },
    { id: "RAZORPAY", name: "Online Payment", icon: "UPI" }
  ];

  const groupedShops = useMemo<CheckoutGroup[]>(() => {
    if (Array.isArray(orderSummary?.groupedShops) && orderSummary.groupedShops.length > 0) {
      return orderSummary.groupedShops;
    }

    const grouped = new Map<string, CheckoutGroup>();
    (items || []).forEach((item: any) => {
      const existing: CheckoutGroup = grouped.get(item.shopId) || {
        shopId: item.shopId,
        shopName: item.shopName,
        items: [],
        subtotal: 0
      };

      existing.items.push(item);
      existing.subtotal += item.price * item.quantity;
      grouped.set(item.shopId, existing);
    });

    return Array.from(grouped.values());
  }, [items, orderSummary?.groupedShops]);

  const getDeliveryTime = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 45 * 60000);
    return deliveryTime.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return "No address";
    if (typeof address === "string") return address;

    const parts = [
      address.street,
      address.area,
      address.landmark ? `Near ${address.landmark}` : null,
      `${address.city}, ${address.state} - ${address.pincode}`
    ].filter(Boolean);

    return parts.join(", ");
  };

  const getDeliveryPin = async () => {
    return orderSummary?.deliveryLocation;
  };

  const createOrderForGroup = async (group: CheckoutGroup, selectedMethod: string, orderDeliveryLocation?: { latitude: number; longitude: number }) => {
    if (
      !orderDeliveryLocation ||
      !Number.isFinite(orderDeliveryLocation.latitude) ||
      !Number.isFinite(orderDeliveryLocation.longitude) ||
      (orderDeliveryLocation.latitude === 0 && orderDeliveryLocation.longitude === 0)
    ) {
      throw new Error("Exact delivery GPS pin is required. Please allow location permission before placing the order.");
    }

    const orderItems = group.items.map((item: any) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      menuItemId: item.menuItemId || item._id || "temp-id"
    }));

    const response = await createShopOrder(
      group.shopId,
      orderSummary.address,
      orderItems,
      orderSummary.note || "",
      selectedMethod,
      orderDeliveryLocation
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || `Failed to place order for ${group.shopName}`);
    }

    return response.data;
  };

  const placeOrders = async (selectedMethod: string) => {
    const createdOrders = [];
    const orderDeliveryLocation = await getDeliveryPin();

    for (const group of groupedShops) {
      createdOrders.push(await createOrderForGroup(group, selectedMethod, orderDeliveryLocation));
    }

    return createdOrders;
  };

  const placeOnlineOrders = async () => {
    const paidOrders = [];
    const orderDeliveryLocation = await getDeliveryPin();

    for (const group of groupedShops) {
      const createdOrder = await createOrderForGroup(group, "RAZORPAY", orderDeliveryLocation);
      const paymentOrderResponse = await createRazorpayOrder({ orderId: createdOrder._id });

      if (!paymentOrderResponse.success || !paymentOrderResponse.data) {
        throw new Error(paymentOrderResponse.message || `Failed to create payment for ${group.shopName}`);
      }

      const paymentOrder = paymentOrderResponse.data;
      if (!paymentOrder.keyId) {
        throw new Error("Payment gateway key is not configured");
      }

      const paymentResult: any = await RazorpayCheckout.open({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || "INR",
        name: "Vyaha",
        description: `Order from ${group.shopName}`,
        order_id: paymentOrder.id,
        prefill: {
          name: userProfile.name,
          contact: userProfile.phone
        },
        theme: { color: "#FF6B35" },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true
        }
      });

      const verifyResponse = await verifyPayment({
        orderId: createdOrder._id,
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature
      });

      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || `Payment verification failed for ${group.shopName}`);
      }

      paidOrders.push(verifyResponse.data || createdOrder);
    }

    return paidOrders;
  };

  const handleSuccessfulCheckout = (createdOrders: any[]) => {
    clear();
    setSuccessOrders(createdOrders);
  };

  const handleBrowseMore = () => {
    setSuccessOrders(null);
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }]
    });
  };

  const handleViewSuccessOrder = () => {
    const orders = successOrders || [];
    setSuccessOrders(null);

    if (orders.length === 1) {
      navigation.replace("OrderStatus", { orderId: orders[0]._id });
      return;
    }

    navigation.replace("Orders");
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      if (paymentMethod === "RAZORPAY") {
        const paidOrders = await placeOnlineOrders();
        handleSuccessfulCheckout(paidOrders);
      } else {
        const createdOrders = await placeOrders("CASH_ON_DELIVERY");
        handleSuccessfulCheckout(createdOrders);
      }
    } catch (error: any) {
      let errorMessage = "Failed to place order";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.message === "string" && error.message.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Order Failed", errorMessage);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const renderPaymentMethod = () => {
    const method = paymentMethods.find((entry) => entry.id === paymentMethod);

    return (
      <View style={styles.selectedMethod}>
        <View>
          <Text style={styles.methodChip}>{method?.icon}</Text>
        </View>
        <View style={styles.methodBody}>
          <Text style={styles.methodName}>{method?.name}</Text>
          <Text style={styles.methodHint}>
            {paymentMethod === "CASH_ON_DELIVERY" ? "Pay when your order arrives" : "Pay securely with UPI, card, wallet, or netbanking"}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowPaymentMethods(true)}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 180 + insets.bottom }}
      >
        <View style={styles.headerSection}>
          <Text style={styles.headerEyebrow}>Checkout</Text>
          <Text style={styles.headerTitle}>Review and place your order</Text>
          <Text style={styles.headerSubtitle}>
            {groupedShops.length} restaurant{groupedShops.length === 1 ? "" : "s"} • {items.length} item
            {items.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Delivery details</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.linkText}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customerName}>{userProfile.name}</Text>
          <Text style={styles.customerPhone}>{userProfile.phone}</Text>
          <Text style={styles.deliveryAddress}>{formatAddress(userProfile.address)}</Text>
          <View style={styles.deliveryTimeBanner}>
            <Text style={styles.deliveryTimeTitle}>Estimated delivery</Text>
            <Text style={styles.deliveryTimeText}>30-45 min • By {getDeliveryTime()}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Restaurants</Text>
          {groupedShops.map((group) => (
            <View key={group.shopId} style={styles.restaurantBlock}>
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName}>{group.shopName}</Text>
                <Text style={styles.restaurantSubtotal}>Rs {group.subtotal}</Text>
              </View>
              {group.items.map((item) => (
                <View key={`${group.shopId}-${item.menuItemId || item.name}`} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.quantity} x {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>Rs {item.quantity * item.price}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {orderSummary.note ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Special instructions</Text>
            <Text style={styles.instructionsText}>{orderSummary.note}</Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          {renderPaymentMethod()}
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Items total</Text>
            <Text style={styles.priceValue}>Rs {orderSummary.subtotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery fee</Text>
            <Text style={styles.priceValue}>Rs {orderSummary.deliveryFee}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount to pay</Text>
            <Text style={styles.totalValue}>Rs {orderSummary.total}</Text>
          </View>
          <Text style={styles.taxNote}>Inclusive of all taxes</Text>
        </View>

        {paymentMethod === "CASH_ON_DELIVERY" ? (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Cash on delivery</Text>
            <Text style={styles.infoText}>Pay cash when the order reaches you. Keeping change ready helps with a faster handoff.</Text>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Online payment</Text>
            <Text style={styles.infoText}>Your order is confirmed only after Razorpay verifies the payment signature.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerEstimate}>Estimated by {getDeliveryTime()}</Text>
          <Text style={styles.footerTotal}>Rs {orderSummary.total}</Text>
        </View>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              {paymentMethod === "CASH_ON_DELIVERY" ? "Place Order" : "Pay Securely"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={Boolean(successOrders)} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <SuccessCelebration />
            <Text style={styles.successTitle}>Order placed successfully</Text>
            <Text style={styles.successText}>
              {successOrders?.length === 1
                ? "Your order is confirmed. Track the live status from here."
                : `${successOrders?.length || 0} restaurant orders were placed. Track them from your orders.`}
            </Text>
            <View style={styles.successActions}>
              <TouchableOpacity style={styles.successSecondaryButton} onPress={handleBrowseMore}>
                <Text style={styles.successSecondaryText}>Browse More</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.successPrimaryButton} onPress={handleViewSuccessOrder}>
                <Text style={styles.successPrimaryText}>
                  {successOrders?.length === 1 ? "View Order Status" : "View Orders"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentMethods} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={styles.methodOption}
                onPress={() => {
                  setPaymentMethod(method.id);
                  setShowPaymentMethods(false);
                }}
              >
                <Text style={styles.methodOptionIcon}>{method.icon}</Text>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodOptionName}>{method.name}</Text>
                  <Text style={styles.methodDescription}>
                    {method.id === "CASH_ON_DELIVERY" ? "Pay cash when the order arrives" : "UPI, card, wallet, and netbanking via Razorpay"}
                  </Text>
                </View>
                {paymentMethod === method.id ? <Text style={styles.selectedIndicator}>Selected</Text> : null}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPaymentMethods(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F3EE"
  },
  content: {
    flex: 1
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 14
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8B6A54",
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C2018"
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#7B6D63"
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12
  },
  sectionHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018"
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2C2018"
  },
  customerPhone: {
    marginTop: 4,
    fontSize: 13,
    color: "#7B6D63"
  },
  deliveryAddress: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  deliveryTimeBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#E8F5E9"
  },
  deliveryTimeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#216E39"
  },
  deliveryTimeText: {
    marginTop: 4,
    fontSize: 13,
    color: "#216E39"
  },
  restaurantBlock: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F2E9E0"
  },
  restaurantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  restaurantName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018",
    marginRight: 8
  },
  restaurantSubtotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FF6B35"
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 5
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#5E5148",
    marginRight: 12
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  instructionsText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  selectedMethod: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EFE5DA",
    borderRadius: 18,
    padding: 14
  },
  methodChip: {
    minWidth: 42,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35"
  },
  methodBody: {
    flex: 1,
    marginHorizontal: 10
  },
  methodName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2C2018"
  },
  methodHint: {
    marginTop: 2,
    fontSize: 12,
    color: "#7B6D63"
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF6B35"
  },
  priceCard: {
    backgroundColor: "#FFF9F4",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F0DDCF",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  priceLabel: {
    fontSize: 13,
    color: "#7B6D63"
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2018"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0DDCF",
    marginTop: 6,
    paddingTop: 12
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
  taxNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#8B6A54"
  },
  infoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    padding: 16,
    marginHorizontal: 16
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 6
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B5E55"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(247,243,238,0.98)",
    borderTopWidth: 1,
    borderTopColor: "#E8DDD2"
  },
  footerSummary: {
    marginBottom: 12
  },
  footerEstimate: {
    fontSize: 12,
    color: "#8B6A54",
    marginBottom: 4
  },
  footerTotal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2C2018"
  },
  payButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center"
  },
  payButtonDisabled: {
    backgroundColor: "#FFB08F"
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  successOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(44, 32, 24, 0.38)",
    padding: 22
  },
  successCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE1D2"
  },
  successPulse: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F8ED",
    borderWidth: 8,
    borderColor: "#F4FFF7",
    marginBottom: 14
  },
  successCheck: {
    fontSize: 34,
    fontWeight: "900",
    color: "#216E39"
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2C2018",
    textAlign: "center"
  },
  successText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55",
    textAlign: "center"
  },
  successActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  successSecondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FFF4EC",
    borderWidth: 1,
    borderColor: "#FFD7C3"
  },
  successPrimaryButton: {
    flex: 1.2,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#FF6B35"
  },
  successSecondaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF6B35"
  },
  successPrimaryText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)"
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018",
    textAlign: "center",
    marginBottom: 16
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3ECE4"
  },
  methodOptionIcon: {
    width: 46,
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35"
  },
  methodInfo: {
    flex: 1
  },
  methodOptionName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2C2018"
  },
  methodDescription: {
    marginTop: 3,
    fontSize: 12,
    color: "#7B6D63"
  },
  selectedIndicator: {
    fontSize: 11,
    fontWeight: "800",
    color: "#216E39"
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center"
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7B6D63"
  }
});
