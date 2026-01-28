import React from "react";
import { View, Text, Button } from "react-native";
import { useCart } from "../context/CartContext";
import { createShopOrder } from "../api/order.api";

export default function CartScreen({ route, navigation }: any) {
  const { shop } = route.params;
  const { items, clear } = useCart();

  const placeOrder = async () => {
    await createShopOrder(
      shop._id,
      "My Home Address",
      items
    );

    clear();
    navigation.replace("Orders");
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20 }}>Cart</Text>

      {items.map((i, idx) => (
        <Text key={idx}>
          {i.quantity} × {i.name} – ₹{i.price}
        </Text>
      ))}

      <Button title="Place Order" onPress={placeOrder} />
    </View>
  );
}
