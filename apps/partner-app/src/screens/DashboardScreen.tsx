// apps/partner-app/src/screens/DashboardScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

export default function DashboardScreen({ navigation }: any) {
  const [shopOpen, setShopOpen] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [stats, setStats] = useState({
    todayOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayEarnings: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Update the loadDashboardData function in DashboardScreen.tsx
const loadDashboardData = async () => {
  try {
    const phone = await AsyncStorage.getItem("phone");
    const res = await api.get(`/partners/status/${phone}`);
    const partnerData = res.data as { success: boolean; data: any };
    setPartner(partnerData.data);
    
    // Load stats - use a fallback for now
    try {
      const statsRes = await api.get("/partners/stats");
      const statsData = statsRes.data as { success: boolean; data: any };
      setStats(statsData.data || {
        todayOrders: 0,
        totalOrders: 0,
        pendingOrders: 0,
        todayEarnings: 0,
        totalEarnings: 0
      });
    } catch (statsError) {
      console.log("Stats endpoint not available yet, using defaults");
    }
  } catch (error) {
    console.error("Failed to load dashboard:", error);
  }
};

  const toggleShopStatus = async () => {
    try {
      await api.put("/partners/shop-status", { isOpen: !shopOpen });
      setShopOpen(!shopOpen);
      Alert.alert(
        "Shop Status Updated",
        `Your shop is now ${!shopOpen ? "OPEN" : "CLOSED"}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to update shop status");
    }
  };

  if (!partner) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.shopStatusContainer}>
          <Text style={styles.shopName}>{partner.restaurantName}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              Status: {shopOpen ? "OPEN" : "CLOSED"}
            </Text>
            <Switch
              value={shopOpen}
              onValueChange={toggleShopStatus}
              trackColor={{ false: "#767577", true: "#4CAF50" }}
              thumbColor={shopOpen ? "#fff" : "#f4f3f4"}
            />
          </View>
          <Text style={styles.statusNote}>
            {shopOpen 
              ? "Customers can see and order from your shop" 
              : "Your shop is hidden from customers"}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.todayOrders}</Text>
            <Text style={styles.statLabel}>Today's Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.todayEarnings}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{partner.menuItemsCount || 0}</Text>
            <Text style={styles.statLabel}>Menu Items</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate("Menu")}
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>🍽️</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Manage Menu</Text>
            <Text style={styles.actionDescription}>
              Add/Edit products, prices, and images
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate("Orders")}
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>📦</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>View Orders</Text>
            <Text style={styles.actionDescription}>
              {stats.pendingOrders} pending orders
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate("Profile")}
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>🏪</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Shop Profile</Text>
            <Text style={styles.actionDescription}>
              Edit shop details and documents
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => navigation.navigate("Settings")}
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>⏰</Text>
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Business Hours</Text>
            <Text style={styles.actionDescription}>
              Set opening and closing times
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent Orders Preview */}
      <View style={styles.ordersPreview}>
        <View style={styles.previewHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Orders")}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {/* You can add recent orders list here */}
        <View style={styles.emptyOrders}>
          <Text style={styles.emptyText}>No recent orders</Text>
          <Text style={styles.emptySubtext}>
            Orders will appear here when customers place them
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  header: {
    backgroundColor: "#2196F3",
    padding: 20
  },
  shopStatusContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    elevation: 3
  },
  shopName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600"
  },
  statusNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic"
  },
  statsContainer: {
    padding: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },
  statCard: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196F3"
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5
  },
  actionsContainer: {
    padding: 15
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    elevation: 2
  },
  actionIconContainer: {
    marginRight: 15
  },
  actionIcon: {
    fontSize: 30
  },
  actionContent: {
    flex: 1
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3
  },
  actionDescription: {
    fontSize: 12,
    color: "#666"
  },
  ordersPreview: {
    padding: 15,
    paddingBottom: 30
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15
  },
  viewAllText: {
    color: "#2196F3",
    fontWeight: "600"
  },
  emptyOrders: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5
  },
  emptySubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center"
  }
});