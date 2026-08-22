// apps/customer-app/src/screens/OrdersScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { getMyOrders } from "../api/order.api";
import type { Order } from "../api/order.api";
import HighlightedOrderId from "../components/HighlightedOrderId";
import ScreenHeader from "../components/ScreenHeader";
import { getPublicShopName } from "../utils/display";

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadOrders = async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await getMyOrders(pageToLoad, 30);
      
      if (response.success && response.data) {
        setOrders((current) => (append ? [...current, ...response.data!] : response.data!));
        setHasMore(response.pagination?.hasMore ?? false);
        setPage(pageToLoad);
      } else {
        Alert.alert("Error", response.message || "Failed to load orders");
      }
    } catch (error: any) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadOrders(1, false);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(1, false);
  };

  const loadMoreOrders = () => {
    if (loadingMore || loading || !hasMore) return;
    loadOrders(page + 1, true);
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
      case 'DELIVERED': return '#1c9b55';
      case 'CONFIRMED': return '#2f6bff';
      case 'PREPARING': return '#2f6bff';
      case 'READY': return '#2f6bff';
      case 'ASSIGNED': return '#2f6bff';
      case 'PICKED_UP': return '#2f6bff';
      case 'REACHED_CUSTOMER': return '#2f6bff';
      case 'CANCELLED': return '#e23744';
      case 'REJECTED': return '#e23744';
      case 'PENDING': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Payment Pending';
      case 'CONFIRMED': return 'Order Placed';
      case 'ACCEPTED': return 'Restaurant Accepted';
      case 'PREPARING': return 'Preparing Food';
      case 'READY': return 'Ready for Pickup';
      case 'ASSIGNED': return 'Delivery Assigned';
      case 'PICKED_UP': return 'On the Way';
      case 'REACHED_CUSTOMER': return 'Rider Arrived';
      case 'DELIVERED': return 'Delivered';
      case 'CANCELLED': return 'Cancelled';
      case 'REJECTED': return 'Rejected by Restaurant';
      default: return status;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderStatus", { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <HighlightedOrderId
            orderId={item._id}
            prefix="Order #"
            style={styles.orderId}
            highlightStyle={{ color: "#e23744", fontWeight: "800" }}
          />
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.restaurantName}>
        {getPublicShopName((item.partnerId as any)?.restaurantName || (item.partnerId as any)?.shopName || "Restaurant")}
      </Text>

      {item.items && Array.isArray(item.items) && item.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsTitle}>Items:</Text>
          {item.items.slice(0, 2).map((orderItem: any, idx: number) => (
            <Text key={idx} style={styles.itemText}>
              {orderItem.quantity} × {orderItem.name}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
          )}
        </View>
      )}

      <View style={styles.orderFooter}>
        <View>
          <Text style={styles.totalLabel}>Total Amount</Text>
          {item.status === "DELIVERED" && !item.ratingSubmittedAt ? (
            <Text style={styles.rateHint}>Tap to rate this order</Text>
          ) : null}
        </View>
        <Text style={styles.totalAmount}>₹{item.grandTotal}</Text>
      </View>
    </TouchableOpacity>
  );

  const displayedOrders = showAllHistory ? orders : orders.slice(0, 3);
  const hasMoreHistory = orders.length > 3;

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="My Orders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e23744" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Orders" />
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubText}>
            Your orders will appear here once you place them
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          ListHeaderComponent={
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>
                  {showAllHistory ? "Complete Order History" : "Latest Orders"}
                </Text>
                <Text style={styles.historySubtitle}>
                  {showAllHistory ? `${orders.length} total orders` : "Showing your latest 3 orders"}
                </Text>
              </View>
              {hasMoreHistory ? (
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => setShowAllHistory((current) => !current)}
                >
                  <Text style={styles.historyButtonText}>
                    {showAllHistory ? "Show Latest 3" : "View All History"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#e23744"]}
            />
          }
          onEndReached={showAllHistory ? loadMoreOrders : undefined}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#e23744" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginVertical: 20,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  browseButton: {
    backgroundColor: '#e23744',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  historySubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#64748B',
  },
  historyButton: {
    backgroundColor: '#FDF2F3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e23744',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  orderDate: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2f6bff',
    marginBottom: 12,
  },
  itemsContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  rateHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e23744',
  },
});
