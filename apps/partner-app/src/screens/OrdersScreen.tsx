import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import api from "../api/client";

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);

  const loadOrders = async () => {
    const res: any = await api.get("/orders/my");
    setOrders(res.data);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderColor: "#ddd"
      }}
      onPress={() => navigation.navigate("OrderDetails", { order: item })}
    >
      <Text style={{ fontWeight: "600" }}>
        Order #{item._id.slice(-6)}
      </Text>
      <Text>Status: {item.status}</Text>
      {item.orderType === "CUSTOM" && (
        <Text>Request: {item.note}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={renderItem}
      />
    </View>
  );
}
