import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import api from "../api/client";

export default function OrderStatusScreen({ route }: any) {
  const { orderId } = route.params;

  const [price, setPrice] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("CREATED");

  const loadStatus = async () => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      const data = res.data as any;

      setStatus(data.status);
      setPrice(data.price);
    } catch {}
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const confirmOrder = async () => {
    try {
      await api.post(`/orders/${orderId}/confirm`);
      Alert.alert("Order confirmed");
      loadStatus();
    } catch {
      Alert.alert("Error", "Failed to confirm");
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Status: {status}</Text>

      {price ? (
        <>
          <Text style={{ fontSize: 20, marginVertical: 10 }}>
            Price: ₹{price}
          </Text>
          <Button title="Accept & Confirm" onPress={confirmOrder} />
        </>
      ) : (
        <Text style={{ marginTop: 10 }}>
          Waiting for partner price…
        </Text>
      )}
    </View>
  );
}
