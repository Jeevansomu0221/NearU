import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  TextInput,
  Alert
} from "react-native";
import {
  getMySubOrders,
  acceptSubOrder,
  rejectSubOrder
} from "../api/partner.api";

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [priceMap, setPriceMap] = useState<{ [key: string]: string }>({});

  const loadOrders = async () => {
    try {
      const res = await getMySubOrders();
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      Alert.alert("Error", "Failed to load orders");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAccept = async (id: string) => {
    const price = priceMap[id];
    if (!price) {
      Alert.alert("Error", "Enter price");
      return;
    }

    try {
      await acceptSubOrder(id, Number(price));
      Alert.alert("Accepted");
      loadOrders();
    } catch {
      Alert.alert("Error", "Failed to accept order");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectSubOrder(id);
      Alert.alert("Rejected");
      loadOrders();
    } catch {
      Alert.alert("Error", "Failed to reject order");
    }
  };

  if (orders.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No orders assigned yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View
          style={{
            borderWidth: 1,
            padding: 12,
            marginBottom: 12,
            borderRadius: 6
          }}
        >
          <Text style={{ fontWeight: "600" }}>Request:</Text>
          <Text>{item.note || "Custom food request"}</Text>

          <TextInput
            placeholder="Enter price"
            keyboardType="number-pad"
            value={priceMap[item._id] || ""}
            onChangeText={(text) =>
              setPriceMap({ ...priceMap, [item._id]: text })
            }
            style={{
              borderWidth: 1,
              padding: 8,
              marginVertical: 8,
              borderRadius: 4
            }}
          />

          <Button title="Accept" onPress={() => handleAccept(item._id)} />
          <View style={{ height: 6 }} />
          <Button
            title="Reject"
            color="red"
            onPress={() => handleReject(item._id)}
          />
        </View>
      )}
    />
  );
}
