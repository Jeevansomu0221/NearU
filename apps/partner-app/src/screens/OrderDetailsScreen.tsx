// apps/partner-app/src/screens/OrderDetailsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal
} from "react-native";
import api from "../api/client";

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
  deliveryPartnerId?: {
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
      // Type cast the response
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

  const updateOrderStatus = async (status: string) => {
    setPendingStatus(status);
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatus) return;

    try {
      setUpdating(true);
      const res = await api.post(`/orders/partner/${orderId}/status`, { status: pendingStatus });
      const response = res.data as ApiResponse<Order>;

      if (response.success) {
        setPendingStatus(null);
        loadOrderDetails();
      } else {
        Alert.alert("Error", response.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error in updateOrderStatus:", error);
      Alert.alert("Error", "Failed to update order status");
    } finally {
      setUpdating(false);
    }
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
      case 'PENDING': return '#FF9800';
      case 'CONFIRMED': return '#2196F3';
      case 'ACCEPTED': return '#00BCD4';
      case 'PREPARING': return '#FF5722';
      case 'READY': return '#9C27B0';
      case 'ASSIGNED': return '#FF9800';
      case 'PICKED_UP': return '#673AB7';
      case 'DELIVERED': return '#4CAF50';
      case 'CANCELLED': return '#F44336';
      case 'REJECTED': return '#795548';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Payment Pending';
      case 'CONFIRMED': return 'Order Placed';
      case 'ACCEPTED': return 'Accepted';
      case 'PREPARING': return 'Preparing Food';
      case 'READY': return 'Ready for Pickup';
      case 'ASSIGNED': return 'Delivery Assigned';
      case 'PICKED_UP': return 'Picked Up';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      case 'REJECTED': return 'Rejected';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'CASH_ON_DELIVERY': return 'Pay on Delivery';
      case 'UPI': return 'UPI Payment';
      case 'RAZORPAY': return 'Online Payment';
      case 'CARD': return 'Card Payment';
      case 'WALLET': return 'Wallet Payment';
      default: return method;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'PAYMENT_PENDING_DELIVERY': return 'Collect on Delivery';
      case 'PAID': return 'Paid';
      case 'FAILED': return 'Failed';
      case 'REFUNDED': return 'Refunded';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getPendingStatusTitle = () => {
    switch (pendingStatus) {
      case "ACCEPTED":
        return "Accept order";
      case "REJECTED":
        return "Reject order";
      case "PREPARING":
        return "Mark as preparing";
      case "READY":
        return "Mark as ready";
      default:
        return `Mark as ${pendingStatus?.replace("_", " ").toLowerCase() || "updated"}`;
    }
  };

  const getPendingStatusText = () => {
    switch (pendingStatus) {
      case "ACCEPTED":
        return "The customer will see that your restaurant accepted the order.";
      case "REJECTED":
        return "The order will be cancelled and the customer will see the refund message if payment was done.";
      default:
        return "";
    }
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

  // Determine which actions are available based on current status
  const showAcceptButton = order.status === "CONFIRMED";
  const showRejectButton = order.status === "CONFIRMED";
  const showPreparingButton = order.status === "ACCEPTED";
  const showReadyButton = order.status === "PREPARING";

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
        <View>
          <Text style={styles.orderId}>Order #{order._id.slice(-6)}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
        </View>
      </View>

      {/* Order Actions */}
      <View style={styles.actionsContainer}>
        {showAcceptButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => updateOrderStatus("ACCEPTED")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>✓ Accept Order</Text>
          </TouchableOpacity>
        )}

        {showPreparingButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.preparingButton]}
            onPress={() => updateOrderStatus("PREPARING")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>👨‍🍳 Start Preparing</Text>
          </TouchableOpacity>
        )}

        {showReadyButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.readyButton]}
            onPress={() => updateOrderStatus("READY")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>✅ Mark as Ready</Text>
          </TouchableOpacity>
        )}

        {showRejectButton && (
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => updateOrderStatus("REJECTED")}
            disabled={updating}
          >
            <Text style={styles.actionButtonText}>✗ Reject Order</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Parcel Handoff */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parcel Handoff</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>#{order._id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Partner:</Text>
            <Text style={styles.infoValue}>{order.deliveryPartnerId?.name || "Not assigned yet"}</Text>
          </View>
          {order.note && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Packing Note:</Text>
              <Text style={styles.infoValue}>{order.note}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.infoCard}>
          {order.items && order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.quantity} × {item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.price} each</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>{getPaymentMethodText(order.paymentMethod)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <View style={[
              styles.paymentStatusBadge,
              { 
                backgroundColor: order.paymentStatus === "PAID" ? "#4CAF50" :
                                order.paymentStatus === "PAYMENT_PENDING_DELIVERY" ? "#FF9800" :
                                order.paymentStatus === "PENDING" ? "#FF9800" : "#F44336"
              }
            ]}>
              <Text style={styles.paymentStatusText}>
                {getPaymentStatusText(order.paymentStatus)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.infoCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Total</Text>
            <Text style={styles.summaryValue}>₹{order.itemTotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>₹{order.deliveryFee || 49}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Amount</Text>
            <Text style={styles.grandTotalValue}>₹{order.grandTotal}</Text>
          </View>
        </View>
      </View>

      {/* Order Timeline */}
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

          {order.status !== "CONFIRMED" && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("ACCEPTED") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Order Accepted</Text>
                <Text style={styles.timelineTime}>—</Text>
              </View>
            </View>
          )}

          {["PREPARING", "READY", "ASSIGNED", "PICKED_UP", "DELIVERED"].includes(order.status) && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("PREPARING") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Food Preparation</Text>
                <Text style={styles.timelineTime}>—</Text>
              </View>
            </View>
          )}

          {["READY", "ASSIGNED", "PICKED_UP", "DELIVERED"].includes(order.status) && (
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: getStatusColor("READY") }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Ready for Pickup</Text>
                <Text style={styles.timelineTime}>—</Text>
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
    fontSize: 18,
    color: '#F44336',
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
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  orderDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  preparingButton: {
    backgroundColor: '#FF9800',
  },
  readyButton: {
    backgroundColor: '#9C27B0',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
    lineHeight: 20,
  },
  phoneText: {
    color: '#2196F3',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 16, 12, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFE0CC"
  },
  confirmEyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: "#C4541C",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  confirmTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "900",
    color: "#2C2018"
  },
  confirmText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B5E55"
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
    backgroundColor: "#F5EFE7"
  },
  confirmSecondaryText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B5E55"
  },
  confirmPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#4CAF50"
  },
  confirmDanger: {
    backgroundColor: "#B42318"
  },
  confirmPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF"
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
});