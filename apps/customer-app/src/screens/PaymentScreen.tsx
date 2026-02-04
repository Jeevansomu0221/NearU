// apps/customer-app/src/screens/PaymentScreen.tsx
import React, { useState } from "react";
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
import { useCart } from "../context/CartContext";
import { createShopOrder } from "../api/order.api";

export default function PaymentScreen({ route, navigation }: any) {
  const { shop, userProfile, orderSummary } = route.params;
  const { items, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const paymentMethods = [
    { id: "CASH_ON_DELIVERY", name: "Pay on Delivery", icon: "💵" },
    { id: "UPI", name: "UPI Payment", icon: "📱" }
  ];

  // Calculate delivery time estimate (30-45 minutes)
  const getDeliveryTime = () => {
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 45 * 60000); // Add 45 minutes
    return deliveryTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatAddress = (address: any) => {
    if (!address) return "No address";
    
    // Check if address is string
    if (typeof address === 'string') return address;
    
    // Format object address
    const addr = address;
    const parts = [
      addr.street,
      addr.area,
      addr.landmark ? `Near ${addr.landmark}` : null,
      `${addr.city}, ${addr.state} - ${addr.pincode}`
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  const handlePayment = async () => {
    if (paymentMethod === "CASH_ON_DELIVERY") {
      await createOrderWithCOD();
    } else if (paymentMethod === "UPI") {
      await processUPIPayment();
    }
  };

  const createOrderWithCOD = async () => {
    try {
      setLoading(true);
      console.log("🛒 Creating COD order with items:", items);
      
      const orderItems = items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId || item._id || "temp-id"
      }));

      console.log("📝 Order items formatted:", orderItems);
      console.log("🏪 Shop ID:", shop._id);
      console.log("📍 Delivery address:", orderSummary.address);
      
      const response = await createShopOrder(
        shop._id,
        orderSummary.address,
        orderItems,
        "",
        "CASH_ON_DELIVERY"
      );

      console.log("📦 Order API Response:", response);

      if (response.success && response.data) {
        console.log("✅ Order created successfully:", response.data._id);
        clear();
        navigation.replace("OrderStatus", { 
          orderId: response.data._id 
        });
      } else {
        console.error("❌ Order creation failed:", response.message);
        Alert.alert(
          "Order Failed", 
          response.message || "Failed to place order",
          [{ text: "OK", style: "default" }]
        );
      }
    } catch (error: any) {
      console.error("❌ COD Order error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let errorMessage = "Failed to place COD order";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Cannot connect to server. Please check your internet connection.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        "Order Failed", 
        errorMessage,
        [
          { 
            text: "Try Again", 
            onPress: () => createOrderWithCOD(),
            style: "default"
          },
          { 
            text: "Cancel", 
            style: "cancel" 
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const processUPIPayment = async () => {
    try {
      setLoading(true);
      
      const orderItems = items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        menuItemId: item.menuItemId || item._id || "temp-id"
      }));

      const orderResponse = await createShopOrder(
        shop._id,
        orderSummary.address,
        orderItems,
        "",
        "UPI"
      );

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.message || "Failed to create order");
      }

      const order = orderResponse.data;
      
      // Simulate UPI payment flow
      Alert.alert(
        "UPI Payment",
        "Opening UPI payment gateway...",
        [
          {
            text: "Pay Now",
            onPress: () => {
              // Simulate successful UPI payment after 2 seconds
              setTimeout(() => {
                Alert.alert(
                  "Payment Successful!",
                  "Your UPI payment was processed successfully!",
                  [
                    {
                      text: "View Order",
                      onPress: () => {
                        clear();
                        navigation.replace("OrderStatus", { orderId: order._id });
                      }
                    }
                  ]
                );
              }, 2000);
            }
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setLoading(false);
            }
          }
        ]
      );

    } catch (error: any) {
      console.error("Payment error:", error);
      Alert.alert("Payment Failed", error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const renderPaymentMethod = () => {
    const method = paymentMethods.find(m => m.id === paymentMethod);
    return (
      <View style={styles.selectedMethod}>
        <Text style={styles.methodIcon}>{method?.icon}</Text>
        <Text style={styles.methodName}>{method?.name}</Text>
        <TouchableOpacity onPress={() => setShowPaymentMethods(true)}>
          <Text style={styles.changeText}>Change</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Order Summary Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <Text style={styles.headerSubtitle}>Review before payment</Text>
        </View>

        {/* Restaurant Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{shop.shopName}</Text>
            <Text style={styles.restaurantCategory}>{shop.category || "Restaurant"}</Text>
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Text style={styles.deliveryLabel}>📍 Delivery to:</Text>
              <TouchableOpacity 
                style={styles.changeAddressButton}
                onPress={() => navigation.navigate("Profile")}
              >
                <Text style={styles.changeAddressText}>Change</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.customerName}>{userProfile.name}</Text>
            <Text style={styles.customerPhone}>📱 {userProfile.phone}</Text>
            <Text style={styles.deliveryAddress}>
              {formatAddress(userProfile.address)}
            </Text>
            
            <View style={styles.deliveryTimeContainer}>
              <Text style={styles.deliveryTimeIcon}>⏰</Text>
              <View style={styles.deliveryTimeInfo}>
                <Text style={styles.deliveryTimeTitle}>Estimated Delivery Time</Text>
                <Text style={styles.deliveryTime}>30-45 minutes • By {getDeliveryTime()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsCard}>
            {items.slice(0, 3).map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.quantity} × {item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
            {items.length > 3 && (
              <Text style={styles.moreItemsText}>+{items.length - 3} more items</Text>
            )}
            <View style={styles.itemsTotal}>
              <Text style={styles.itemsTotalLabel}>Items Total</Text>
              <Text style={styles.itemsTotalValue}>₹{orderSummary.subtotal}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {renderPaymentMethod()}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Item Total</Text>
            <Text style={styles.priceValue}>₹{orderSummary.subtotal}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Delivery Fee</Text>
            <Text style={styles.priceValue}>₹{orderSummary.deliveryFee}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount to Pay</Text>
            <Text style={styles.totalValue}>₹{orderSummary.total}</Text>
          </View>
          <Text style={styles.taxNote}>*Inclusive of all taxes</Text>
        </View>

        {/* Payment Instructions */}
        {paymentMethod === "CASH_ON_DELIVERY" && (
          <View style={styles.infoSection}>
            <Text style={styles.infoIcon}>💰</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Pay on Delivery</Text>
              <Text style={styles.infoText}>
                • Pay cash to delivery partner when order arrives
                • Exact change is appreciated
                • Delivery partner will provide receipt
              </Text>
            </View>
          </View>
        )}

        {paymentMethod === "UPI" && (
          <View style={styles.infoSection}>
            <Text style={styles.infoIcon}>📱</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>UPI Payment</Text>
              <Text style={styles.infoText}>
                • You'll be redirected to UPI app
                • Complete payment to confirm order
                • Payment verification takes 2-3 seconds
              </Text>
            </View>
          </View>
        )}

        {/* Security Info */}
        <View style={styles.securitySection}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Your payment information is secure and encrypted
          </Text>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <View style={styles.footerSummary}>
          <View>
            <Text style={styles.deliveryEstimate}>Estimated delivery by {getDeliveryTime()}</Text>
            <Text style={styles.footerTotalLabel}>Total: ₹{orderSummary.total}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.payButton,
              loading && styles.payButtonDisabled
            ]}
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                {paymentMethod === "CASH_ON_DELIVERY" 
                  ? `Place COD Order`
                  : `Pay via UPI`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.termsText}>
          By proceeding, you agree to our Terms & Conditions
        </Text>
      </View>

      {/* Payment Methods Modal */}
      <Modal
        visible={showPaymentMethods}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            
            {paymentMethods.map(method => (
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
                    {method.id === "CASH_ON_DELIVERY" 
                      ? "Pay cash when order arrives" 
                      : "Pay now via UPI apps"}
                  </Text>
                </View>
                {paymentMethod === method.id && (
                  <Text style={styles.selectedIndicator}>✓</Text>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentMethods(false)}
            >
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  headerSection: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  restaurantCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deliveryCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  changeAddressButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeAddressText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  deliveryTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
  },
  deliveryTimeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  deliveryTimeInfo: {
    flex: 1,
  },
  deliveryTimeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 13,
    color: '#2E7D32',
  },
  itemsCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  moreItemsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  itemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  itemsTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemsTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  selectedMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  methodIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  methodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  priceSection: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    margin: 16,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  taxNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryEstimate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  footerTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  payButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#FFB08F',
  },
  payButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  methodOptionIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  methodInfo: {
    flex: 1,
  },
  methodOptionName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 13,
    color: '#666',
  },
  selectedIndicator: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});