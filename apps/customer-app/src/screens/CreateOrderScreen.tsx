import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet
} from "react-native";
import { createOrder } from "../api/order.api";

export default function CreateOrderScreen({ route, navigation }: any) {
  const { shop } = route.params;

  const [note, setNote] = useState("");
  const [address, setAddress] = useState("My Home, Hyderabad");
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!note.trim()) {
      Alert.alert("Error", "Please enter your food request");
      return;
    }

    try {
      setLoading(true);

      const res = await createOrder(address, note);

      const orderId = (res.data as any).orderId;

      Alert.alert("Order placed", "Waiting for partner confirmation");

      navigation.replace("OrderStatus", { orderId });
    } catch (error) {
      Alert.alert("Error", "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.shopName}>{shop.shopName}</Text>

      <Text style={styles.label}>Your request</Text>
      <TextInput
        placeholder="Eg: 2 idli, 1 vada, less spicy"
        value={note}
        onChangeText={setNote}
        multiline
        style={styles.textArea}
      />

      <Text style={styles.label}>Delivery address</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <Button
        title={loading ? "Placing..." : "Place Order"}
        onPress={handlePlaceOrder}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  shopName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20
  },
  label: {
    marginBottom: 6,
    fontWeight: "500"
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    height: 80,
    marginBottom: 20,
    borderRadius: 6
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 20,
    borderRadius: 6
  }
});
