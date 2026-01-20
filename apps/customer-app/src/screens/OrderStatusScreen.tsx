import React from "react";
import { View, Text } from "react-native";

export default function OrderStatusScreen({ route }: any) {
  const { orderId } = route.params;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>Order ID</Text>
      <Text>{orderId}</Text>
      <Text style={{ marginTop: 10 }}>
        Waiting for partner acceptance…
      </Text>
    </View>
  );
}
