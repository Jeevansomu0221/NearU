import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet
} from "react-native";
import { getNearbyShops } from "../api/user.api";

export default function HomeScreen({ navigation }: any) {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const res = await getNearbyShops();
      setShops((res.data as any[]) ?? []);

    } catch (error) {
      console.log("Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Food Shops</Text>

      <FlatList
        data={shops}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("CreateOrder", { shop: item })
            }
          >
            <Text style={styles.shopName}>{item.shopName}</Text>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.status}>
              {item.isOpen ? "Open" : "Closed"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No shops nearby
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  title: {
    fontSize: 22,
    marginBottom: 10
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10
  },
  shopName: {
    fontSize: 18,
    fontWeight: "600"
  },
  category: {
    color: "#666"
  },
  status: {
    marginTop: 4,
    color: "green"
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }
});
