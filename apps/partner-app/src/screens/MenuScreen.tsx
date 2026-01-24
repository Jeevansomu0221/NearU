import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";
import api from "../api/client";

type MenuItem = {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

export default function MenuScreen() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const loadMenu = async () => {
    const res = await api.get<MenuItem[]>("/partner/menu");
    setMenu(res.data);
  };

  useEffect(() => {
    loadMenu();
  }, []);

  const addItem = async () => {
    if (!name || !price) return;

    await api.post("/partner/menu", {
      name,
      price: Number(price)
    });

    setName("");
    setPrice("");
    loadMenu();
  };

  const toggleItem = async (id: string) => {
    await api.patch(`/partner/menu/${id}/toggle`);
    loadMenu();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Menu</Text>

      <FlatList
        data={menu}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>
              {item.name} – ₹{item.price}
            </Text>
            <Button
              title={item.isAvailable ? "Disable" : "Enable"}
              onPress={() => toggleItem(item._id)}
            />
          </View>
        )}
      />

      <View style={styles.addBox}>
        <TextInput
          placeholder="Item name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="Price"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          style={styles.input}
        />
        <Button title="Add Item" onPress={addItem} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  title: { fontSize: 20, marginBottom: 10 },
  row: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 8,
    borderRadius: 6
  },
  addBox: {
    marginTop: 20,
    borderTopWidth: 1,
    paddingTop: 10
  },
  input: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 8,
    borderRadius: 4
  }
});
