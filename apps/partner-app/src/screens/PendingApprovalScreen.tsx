// apps/partner-app/src/screens/PendingApprovalScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
  createdAt: string;
}

export default function PendingApprovalScreen({ navigation }: any) {
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);

  const checkStatus = async () => {
    const phone = await AsyncStorage.getItem("partnerPhone");
    if (!phone) return;

    try {
      const res = await api.get(`/partners/status/${phone}`);
      const data = res.data as { success: boolean; data: PartnerData };
      
      if (data.success && data.data) {
        setPartnerData(data.data);
        
        // Auto-navigate if approved
        if (data.data.status === "APPROVED") {
          navigation.reset({
            index: 0,
            routes: [{ name: "Orders" }]
          });
        } else if (data.data.status === "REJECTED") {
          navigation.reset({
            index: 0,
            routes: [{ name: "Rejected" }]
          });
        }
      }
    } catch (error) {
      console.error("Status check failed", error);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Under Review</Text>
      <Text style={styles.message}>
        Your partner application is being reviewed by our admin team.
      </Text>
      <Text style={styles.message}>
        You'll be notified once a decision is made.
      </Text>
      
      {partnerData && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Application Details:</Text>
          <Text>Name: {partnerData.ownerName}</Text>
          <Text>Restaurant: {partnerData.restaurantName}</Text>
          <Text>Category: {partnerData.category}</Text>
          <Text>Submitted: {new Date(partnerData.createdAt).toLocaleDateString()}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.button} onPress={checkStatus}>
        <Text style={styles.buttonText}>Check Status</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
    color: "#666"
  },
  infoCard: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 30,
    width: "100%"
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    width: "80%"
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center"
  }
});