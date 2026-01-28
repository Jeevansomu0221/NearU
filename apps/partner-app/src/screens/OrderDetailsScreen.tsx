import React from "react";
import { View, Text } from "react-native";

export default function OrderDetailsScreen({ route }: any) {
  const { order } = route.params;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Order #{order._id.slice(-6)}
      </Text>

      <Text style={{ marginTop: 10 }}>
        Status: {order.status}
      </Text>

      <Text style={{ marginTop: 10 }}>
        Delivery Address:
      </Text>
      <Text>{order.deliveryAddress}</Text>

      {order.orderType === "CUSTOM" && (
        <>
          <Text style={{ marginTop: 10 }}>
            Customer Request:
          </Text>
          <Text>{order.note}</Text>
        </>
      )}

      {order.orderType === "SHOP" && (
        <>
          <Text style={{ marginTop: 10 }}>
            Items:
          </Text>
          {order.items.map((i: any, idx: number) => (
            <Text key={idx}>
              {i.quantity} × {i.name}
            </Text>
          ))}
        </>
      )}
    </View>
  );
}
