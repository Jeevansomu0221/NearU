// apps/partner-app/src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

interface Partner {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  createdAt: string;
}

interface Stats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalEarnings: number;
  todayEarnings: number;
}

export default function ProfileScreen({ navigation }: any) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
    todayEarnings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const phone = await AsyncStorage.getItem("phone");
      if (!phone) {
        navigation.replace("Login");
        return;
      }

      const res = await api.get(`/partners/status/${phone}`);
      const data = res.data as { success: boolean; data: Partner };
      
      if (data.success) {
        setPartner(data.data);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // You'll need to implement these API endpoints
      // const res = await api.get("/partners/stats");
      // setStats(res.data.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace("Login");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.container}>
        <Text>No profile data found</Text>
        <TouchableOpacity onPress={() => navigation.replace("Login")}>
          <Text>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {partner.restaurantName.charAt(0)}
          </Text>
        </View>
        <Text style={styles.shopName}>{partner.restaurantName}</Text>
        <Text style={styles.category}>{partner.category.toUpperCase()}</Text>
        <View style={[
          styles.statusBadge,
          partner.status === "APPROVED" ? styles.approvedBadge : 
          partner.status === "PENDING" ? styles.pendingBadge :
          styles.rejectedBadge
        ]}>
          <Text style={styles.statusText}>{partner.status}</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.totalEarnings}</Text>
          <Text style={styles.statLabel}>Total Earnings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹{stats.todayEarnings}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Owner Name:</Text>
          <Text style={styles.infoValue}>{partner.ownerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{partner.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue}>{partner.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category:</Text>
          <Text style={styles.infoValue}>{partner.category}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Registered:</Text>
          <Text style={styles.infoValue}>
            {new Date(partner.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate("Menu")}
        >
          <Text style={styles.actionIcon}>🍽️</Text>
          <Text style={styles.actionText}>Manage Menu</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📄</Text>
          <Text style={styles.actionText}>Upload Documents</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: {
    marginTop: 10,
    color: "#666"
  },
  header: {
    backgroundColor: "#2196F3",
    padding: 20,
    alignItems: "center"
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15
  },
  avatarText: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold"
  },
  shopName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5
  },
  category: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 10
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15
  },
  approvedBadge: {
    backgroundColor: "#4CAF50"
  },
  pendingBadge: {
    backgroundColor: "#FF9800"
  },
  rejectedBadge: {
    backgroundColor: "#F44336"
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold"
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 15,
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
  section: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333"
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0"
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 2,
    textAlign: "right"
  },
  actionsContainer: {
    padding: 15,
    marginBottom: 30
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 15
  },
  actionText: {
    fontSize: 16,
    color: "#333"
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#ffebee"
  },
  logoutText: {
    color: "#f44336"
  }
});