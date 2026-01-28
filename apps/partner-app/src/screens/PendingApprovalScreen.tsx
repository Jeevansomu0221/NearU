import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ActivityIndicator 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

interface PartnerData {
  _id: string;
  ownerName: string;
  restaurantName: string;
  phone: string;
  address: string;
  category: string;
  status: string;
  hasCompletedSetup?: boolean;
  menuItemsCount?: number;
  createdAt: string;
}

interface PendingApprovalScreenProps {
  navigation: any;
}

export default function PendingApprovalScreen({ navigation }: PendingApprovalScreenProps) {
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const phone = await AsyncStorage.getItem("phone");
      
      if (!token || !phone) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }]
        });
        return;
      }

      const res = await api.get("/partners/my-status");
      const data = res.data as { success: boolean; data: PartnerData };
      
      if (data.success && data.data) {
        setPartnerData(data.data);
        
        // Auto-navigate based on status
        if (data.data.status === "APPROVED") {
          // Check if they need menu setup
          if (!data.data.hasCompletedSetup && (!data.data.menuItemsCount || data.data.menuItemsCount === 0)) {
            // Redirect to WelcomeApproved screen first
            navigation.reset({
              index: 0,
              routes: [{ name: "WelcomeApproved" }]
            });
          } else {
            // Already has menu items, go to dashboard
            navigation.reset({
              index: 0,
              routes: [{ name: "Dashboard" }]
            });
          }
        } else if (data.data.status === "REJECTED") {
          navigation.reset({
            index: 0,
            routes: [{ name: "Rejected" }]
          });
        }
      }
    } catch (error) {
      console.error("Status check failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Checking your application status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Application Under Review</Text>
        <Text style={styles.subtitle}>
          We're reviewing your partner application
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.message}>
          Your application is currently being reviewed by our admin team.
        </Text>
        <Text style={styles.message}>
          This usually takes 24-48 hours. You'll receive a notification once a decision is made.
        </Text>
        
        {partnerData && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Application Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Owner Name:</Text>
              <Text style={styles.infoValue}>{partnerData.ownerName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Restaurant:</Text>
              <Text style={styles.infoValue}>{partnerData.restaurantName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Category:</Text>
              <Text style={styles.infoValue}>{partnerData.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted:</Text>
              <Text style={styles.infoValue}>
                {new Date(partnerData.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                Status: {partnerData.status}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={checkStatus}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Refresh Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>
          This page will automatically refresh every 30 seconds.
          You'll be redirected once your application is processed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#2196F3",
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    color: "#666",
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  statusBadge: {
    backgroundColor: "#FFC107",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  secondaryButtonText: {
    color: "#2196F3",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 20,
  },
});