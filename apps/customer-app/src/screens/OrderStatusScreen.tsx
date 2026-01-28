import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import api from "../api/client";

type Order = {
  _id: string;
  status: string;
  grandTotal?: number;
};

export default function OrderStatusScreen({ route }: any) {
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);

  const loadStatus = async () => {
    try {
      const res: any = await api.get("/orders/my");
      const orders: Order[] = res.data;

      const current = orders.find(o => o._id === orderId);
      if (current) {
        setOrder(current);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 5000);
    return () => clearInterval(timer);
  }, []);

  const confirmOrder = async () => {
    try {
      await api.post(`/orders/${orderId}/accept`);
      Alert.alert("Order confirmed");
      loadStatus();
    } catch {
      Alert.alert("Error", "Failed to confirm order");
    }
  };

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading order...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Status: {order.status}</Text>

      {order.status === "PRICED" && (
        <>
          <Text style={{ fontSize: 20, marginVertical: 10 }}>
            Total: ₹{order.grandTotal}
          </Text>
          <Button title="Accept & Confirm" onPress={confirmOrder} />
        </>
      )}

      {order.status === "CREATED" && (
        <Text>Waiting for admin to price your order…</Text>
      )}

      {order.status === "CONFIRMED" && (
        <Text>Order confirmed. Preparing…</Text>
      )}
    </View>
  );
}
