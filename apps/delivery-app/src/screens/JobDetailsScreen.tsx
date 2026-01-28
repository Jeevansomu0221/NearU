import React, { useState } from "react";
import { View, Text, Button, Alert } from "react-native";
import api from "../api/client";

export default function JobDetailsScreen({ route, navigation }: any) {
  const { order } = route.params;
  const [status, setStatus] = useState(order.status);

  const updateStatus = async (newStatus: string) => {
    try {
      await api.post(`/orders/${order._id}/status`, {
        status: newStatus
      });

      setStatus(newStatus);
      Alert.alert("Success", `Order ${newStatus}`);
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update status");
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Order #{order._id.slice(-6)}
      </Text>

      <Text style={{ marginTop: 10 }}>
        Delivery Address:
      </Text>
      <Text>{order.deliveryAddress}</Text>

      <Text style={{ marginTop: 10 }}>
        Current Status: {status}
      </Text>

      {status === "ASSIGNED" && (
        <Button
          title="Mark Picked Up"
          onPress={() => updateStatus("PICKED_UP")}
        />
      )}

      {status === "PICKED_UP" && (
        <Button
          title="Mark Delivered"
          onPress={() => updateStatus("DELIVERED")}
        />
      )}
    </View>
  );
}
