import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList } from "react-native";
import { getPartnerMenu } from "../api/menu.api";
import { useCart } from "../context/CartContext";

export default function ShopDetailScreen({ route, navigation }: any) {
  const { shop } = route.params;
  const [menu, setMenu] = useState<any[]>([]);
  const { addItem } = useCart();

  const loadMenu = async () => {
    const res: any = await getPartnerMenu(shop._id);
    setMenu(res.data);
  };

  useEffect(() => {
    loadMenu();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>
        {shop.restaurantName}
      </Text>

      <FlatList
        data={menu.filter(i => i.isAvailable)}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1 }}>
            <Text>{item.name}</Text>
            <Text>₹{item.price}</Text>

            <Button
              title="Add"
              onPress={() =>
                addItem({
                  name: item.name,
                  price: item.price,
                  quantity: 1
                })
              }
            />
          </View>
        )}
      />

      <Button
        title="Go to Cart"
        onPress={() => navigation.navigate("Cart", { shop })}
      />
    </View>
  );
}
