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
  RefreshControl,
  Linking
} from "react-native";
import { getOrderDetails } from "../api/order.api";
import type { Order } from "../api/order.api";

export default function OrderStatusScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrderDetails = async () => {
    try {
      const response = await getOrderDetails(orderId);
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        Alert.alert("Error", response.message || "Failed to load order details");
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
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      if (!loading) {
        loadOrderDetails();
      }
    }, 30000);
    
    return () => clearInterval(interval);
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
      case 'PENDING': return '#FF9800';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Payment Pending';
      case 'CONFIRMED': return 'Order Confirmed';
      case 'PREPARING': return 'Preparing Food';
      case 'READY': return 'Ready for Pickup';
      case 'ASSIGNED': return 'Delivery Boy Assigned';
      case 'PICKED_UP': return 'On the Way';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      case 'REJECTED': return 'Rejected by Restaurant';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return '⏳';
      case 'CONFIRMED': return '✅';
      case 'PREPARING': return '👨‍🍳';
      case 'READY': return '📦';
      case 'ASSIGNED': return '🚶‍♂️';
      case 'PICKED_UP': return '🛵';
      case 'DELIVERED': return '🏠';
      case 'CANCELLED': return '❌';
      case 'REJECTED': return '🚫';
      default: return '📊';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Waiting for payment confirmation';
      case 'CONFIRMED': return 'Restaurant has received your order';
      case 'PREPARING': return 'Chef is preparing your delicious food';
      case 'READY': return 'Food is ready and waiting for pickup';
      case 'ASSIGNED': return 'Delivery partner is assigned to your order';
      case 'PICKED_UP': return 'Delivery partner picked up your order';
      case 'DELIVERED': return 'Order successfully delivered to you';
      case 'CANCELLED': return 'Order has been cancelled';
      case 'REJECTED': return 'Restaurant rejected your order';
      default: return '';
    }
  };

  const statusSteps = [
    { status: 'CONFIRMED', label: 'Order Confirmed' },
    { status: 'PREPARING', label: 'Preparing Food' },
    { status: 'READY', label: 'Ready for Pickup' },
    { status: 'ASSIGNED', label: 'Delivery Boy Assigned' },
    { status: 'PICKED_UP', label: 'On the Way' },
    { status: 'DELIVERED', label: 'Delivered' },
  ];

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    
    // Map status to step index
    const statusOrder = ['CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];
    const stepIndex = statusOrder.indexOf(order.status);
    
    // If status is PENDING, show 0 (before CONFIRMED)
    if (order.status === 'PENDING') return -1;
    
    // If status is CANCELLED or REJECTED, show all steps as inactive
    if (order.status === 'CANCELLED' || order.status === 'REJECTED') return -2;
    
    return stepIndex !== -1 ? stepIndex : 0;
  };

  const callDeliveryPartner = () => {
    if (order?.deliveryPartnerId?.phone) {
      const phoneNumber = `tel:${order.deliveryPartnerId.phone}`;
      Linking.canOpenURL(phoneNumber)
        .then(supported => {
          if (supported) {
            Linking.openURL(phoneNumber);
          } else {
            Alert.alert('Error', 'Phone calls are not supported on this device');
          }
        })
        .catch(err => console.error('Error opening phone dialer:', err));
    }
  };

  const callRestaurant = () => {
    if (order?.partnerId?.phone) {
      const phoneNumber = `tel:${order.partnerId.phone}`;
      Linking.canOpenURL(phoneNumber)
        .then(supported => {
          if (supported) {
            Linking.openURL(phoneNumber);
          } else {
            Alert.alert('Error', 'Phone calls are not supported on this device');
          }
        })
        .catch(err => console.error('Error opening phone dialer:', err));
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

  const currentStep = getCurrentStepIndex();
  const isCancelledOrRejected = order.status === 'CANCELLED' || order.status === 'REJECTED';

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

      {/* Status Description */}
      <View style={styles.statusDescriptionContainer}>
        <Text style={styles.statusDescriptionText}>
          {getStatusDescription(order.status)}
        </Text>
      </View>

      {/* Order Progress Timeline */}
      {!isCancelledOrRejected && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Progress</Text>
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
                <View style={styles.timelineContent}>
                  <Text style={[
                    styles.timelineLabel,
                    index <= currentStep ? styles.timelineLabelActive : styles.timelineLabelInactive
                  ]}>
                    {step.label}
                  </Text>
                  {index <= currentStep && (
                    <Text style={styles.timelineTime}>
                      {index === currentStep ? 'In progress' : 'Completed'}
                    </Text>
                  )}
                </View>
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
      )}

      {/* Restaurant Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restaurant Details</Text>
        <View style={styles.infoCard}>
          <Text style={styles.restaurantName}>
            {(order.partnerId as any)?.restaurantName || (order.partnerId as any)?.shopName || "Restaurant"}
          </Text>
          {(order.partnerId as any)?.phone && (
            <TouchableOpacity 
              style={styles.callButton}
              onPress={callRestaurant}
            >
              <Text style={styles.callButtonText}>📞 Call Restaurant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Delivery Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        <View style={styles.infoCard}>
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryLabel}>Delivery Address:</Text>
            <Text style={styles.deliveryValue}>{order.deliveryAddress || "No address provided"}</Text>
          </View>
          
          {order.deliveryPartnerId && (
            <>
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryLabel}>Delivery Partner:</Text>
                <Text style={styles.deliveryValue}>
                  {(order.deliveryPartnerId as any)?.name}
                </Text>
              </View>
              
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryLabel}>Contact Number:</Text>
                <TouchableOpacity onPress={callDeliveryPartner}>
                  <Text style={[styles.deliveryValue, styles.phoneLink]}>
                    {(order.deliveryPartnerId as any)?.phone}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          
          {order.note && (
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Special Instructions:</Text>
              <Text style={styles.deliveryValue}>{order.note}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <View style={styles.infoCard}>
          {order.items && order.items.map((item: any, index: number) => (
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
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Text style={styles.paymentValue}>
              {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Pay on Delivery' : 
               order.paymentMethod === 'UPI' ? 'UPI Payment' : 
               order.paymentMethod || 'Online'}
            </Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Status:</Text>
            <View style={[
              styles.paymentStatusBadge,
              { 
                backgroundColor: order.paymentStatus === 'PAID' ? '#4CAF50' : 
                                order.paymentStatus === 'PENDING' ? '#FF9800' : '#F44336' 
              }
            ]}>
              <Text style={styles.paymentStatusText}>
                {order.paymentStatus === 'PAID' ? 'Paid' : 
                 order.paymentStatus === 'PENDING' ? 'Pending' : 
                 order.paymentStatus}
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
      </View>

      {/* Support Info */}
      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <Text style={styles.supportText}>
          Contact our support team for any order-related queries
        </Text>
        <View style={styles.supportButtons}>
          <TouchableOpacity style={styles.supportButton}>
            <Text style={styles.supportButtonText}>Chat with Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButtonSecondary}>
            <Text style={styles.supportButtonSecondaryText}>Call Support</Text>
          </TouchableOpacity>
        </View>
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
  statusDescriptionContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginTop: 8,
  },
  statusDescriptionText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    lineHeight: 20,
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
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
  },
  timeline: {
    marginTop: 8,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
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
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  timelineLabelActive: {
    color: '#333',
  },
  timelineLabelInactive: {
    color: '#999',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  timelineLine: {
    position: 'absolute',
    left: 16,
    top: 32,
    bottom: -20,
    width: 2,
  },
  timelineLineActive: {
    backgroundColor: '#FF6B35',
  },
  timelineLineInactive: {
    backgroundColor: '#e0e0e0',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  phoneLink: {
    color: '#2196F3',
    textDecorationLine: 'underline',
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
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    marginTop: 20,
    marginBottom: 30,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
    textAlign: 'center',
  },
  supportText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  supportButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
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
  supportButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  supportButtonSecondaryText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
});