// apps/customer-app/src/screens/OrderStatusScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl
} from "react-native";
import { getOrderDetails } from "../api/order.api";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  _id: string;
  status: string;
  grandTotal: number;
  itemTotal: number;
  deliveryFee: number;
  createdAt: string;
  deliveryAddress: string;
  note?: string;
  partnerId: {
    restaurantName: string;
    shopName: string;
    phone?: string;
    address?: any;
  };
  customerId: {
    name: string;
    phone: string;
  };
  deliveryPartnerId?: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
}

interface OrderResponse {
  success: boolean;
  data: OrderDetails;
  message: string;
}

export default function OrderStatusScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrderDetails = async () => {
    try {
      const response = await getOrderDetails(orderId);
      const orderData = response.data as OrderResponse;
      
      if (orderData.success) {
        setOrder(orderData.data);
      } else {
        Alert.alert("Error", orderData.message || "Failed to load order details");
      }
    } catch (error) {
      console.error("Error loading order:", error);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return '#4CAF50';
      case 'CONFIRMED': return '#2196F3';
      case 'PREPARING': return '#FF9800';
      case 'READY': return '#9C27B0';
      case 'ASSIGNED': return '#673AB7';
      case 'PICKED_UP': return '#3F51B5';
      case 'CANCELLED': return '#F44336';
      case 'REJECTED': return '#795548';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Order Placed';
      case 'ACCEPTED': return 'Restaurant Accepted';
      case 'PREPARING': return 'Preparing Food';
      case 'READY': return 'Ready for Pickup';
      case 'ASSIGNED': return 'Delivery Assigned';
      case 'PICKED_UP': return 'On the Way';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      case 'REJECTED': return 'Rejected by Restaurant';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return '📋';
      case 'ACCEPTED': return '✅';
      case 'PREPARING': return '👨‍🍳';
      case 'READY': return '📦';
      case 'ASSIGNED': return '🚗';
      case 'PICKED_UP': return '🛵';
      case 'DELIVERED': return '🏠';
      case 'CANCELLED': return '❌';
      case 'REJECTED': return '🚫';
      default: return '📊';
    }
  };

  const statusSteps = [
    { status: 'CONFIRMED', label: 'Order Placed' },
    { status: 'ACCEPTED', label: 'Restaurant Accepted' },
    { status: 'PREPARING', label: 'Preparing Food' },
    { status: 'READY', label: 'Ready for Pickup' },
    { status: 'ASSIGNED', label: 'Delivery Assigned' },
    { status: 'PICKED_UP', label: 'On the Way' },
    { status: 'DELIVERED', label: 'Delivered' },
  ];

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const stepIndex = statusSteps.findIndex(step => step.status === order.status);
    return stepIndex !== -1 ? stepIndex : 0;
  };

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
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = getCurrentStepIndex();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#FF6B35"]}
        />
      }
    >
      {/* Order Header */}
      <View style={styles.header}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(order.status)}</Text>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      {/* Restaurant Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restaurant Details</Text>
        <Text style={styles.restaurantName}>
          {order.partnerId?.restaurantName || order.partnerId?.shopName || "Restaurant"}
        </Text>
        {order.partnerId?.phone && (
          <Text style={styles.restaurantPhone}>📱 {order.partnerId.phone}</Text>
        )}
      </View>

      {/* Delivery Status Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        <View style={styles.timeline}>
          {statusSteps.map((step, index) => (
            <View key={step.status} style={styles.timelineStep}>
              <View style={[
                styles.timelineDot,
                index <= currentStep ? styles.timelineDotActive : styles.timelineDotInactive
              ]}>
                <Text style={[
                  styles.timelineDotText,
                  index <= currentStep ? styles.timelineDotTextActive : styles.timelineDotTextInactive
                ]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[
                styles.timelineLabel,
                index <= currentStep ? styles.timelineLabelActive : styles.timelineLabelInactive
              ]}>
                {step.label}
              </Text>
              {index < statusSteps.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  index < currentStep ? styles.timelineLineActive : styles.timelineLineInactive
                ]} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryLabel}>Delivery Address:</Text>
          <Text style={styles.deliveryValue}>{order.deliveryAddress}</Text>
        </View>
        
        {order.deliveryPartnerId && (
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryLabel}>Delivery Partner:</Text>
            <Text style={styles.deliveryValue}>
              {order.deliveryPartnerId.name} ({order.deliveryPartnerId.phone})
            </Text>
          </View>
        )}
        
        {order.note && (
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryLabel}>Special Instructions:</Text>
            <Text style={styles.deliveryValue}>{order.note}</Text>
          </View>
        )}
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {order.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.quantity} × {item.name}</Text>
            <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Item Total</Text>
          <Text style={styles.summaryValue}>₹{order.itemTotal || 0}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>₹{order.deliveryFee || 49}</Text>
        </View>
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total Amount</Text>
          <Text style={styles.grandTotalValue}>₹{order.grandTotal || 0}</Text>
        </View>
      </View>

      {/* Support Info */}
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          If you have any questions about your order, contact restaurant or our support team.
        </Text>
        <TouchableOpacity style={styles.supportButton}>
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#FF6B35',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  restaurantPhone: {
    fontSize: 14,
    color: '#666',
  },
  timeline: {
    marginTop: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineDotActive: {
    backgroundColor: '#FF6B35',
  },
  timelineDotInactive: {
    backgroundColor: '#e0e0e0',
  },
  timelineDotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timelineDotTextActive: {
    color: 'white',
  },
  timelineDotTextInactive: {
    color: '#888',
  },
  timelineLabel: {
    fontSize: 14,
    flex: 1,
  },
  timelineLabelActive: {
    color: '#333',
    fontWeight: '500',
  },
  timelineLabelInactive: {
    color: '#999',
  },
  timelineLine: {
    position: 'absolute',
    left: 16,
    top: 32,
    bottom: -16,
    width: 2,
  },
  timelineLineActive: {
    backgroundColor: '#FF6B35',
  },
  timelineLineInactive: {
    backgroundColor: '#e0e0e0',
  },
  deliveryInfo: {
    marginBottom: 12,
  },
  deliveryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  deliveryValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
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
    fontSize: 15,
    color: '#333',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF6B35',
  },
  supportSection: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  supportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});