import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { partnerTheme } from "../../theme";

export type MenuDraftItem = {
  name: string;
  description: string;
  price: string;
  isVegetarian: boolean;
  imageUrl: string;
};

type Props = {
  items: MenuDraftItem[];
  onChange: (items: MenuDraftItem[]) => void;
};

const emptyItem = (): MenuDraftItem => ({
  name: "",
  description: "",
  price: "",
  isVegetarian: true,
  imageUrl: ""
});

export default function MenuDraftStep({ items, onChange }: Props) {
  const updateItem = (index: number, patch: Partial<MenuDraftItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    if (items.length >= 10) return;
    onChange([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <View>
      <Text style={styles.hint}>
        Add a few starter menu items now, or skip and build your full menu after approval from the Menu tab.
      </Text>
      {items.map((item, index) => (
        <View key={`menu-${index}`} style={styles.card}>
          <Text style={styles.cardTitle}>Item {index + 1}</Text>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Masala Dosa"
            placeholderTextColor="#98A2B3"
            value={item.name}
            onChangeText={(name) => updateItem(index, { name })}
          />
          <Text style={styles.label}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="99"
            placeholderTextColor="#98A2B3"
            keyboardType="decimal-pad"
            value={item.price}
            onChangeText={(price) => updateItem(index, { price: price.replace(/[^\d.]/g, "") })}
          />
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Short description"
            placeholderTextColor="#98A2B3"
            value={item.description}
            onChangeText={(description) => updateItem(index, { description })}
          />
          <View style={styles.chipRow}>
            {(["veg", "non-veg"] as const).map((type) => {
              const selected = type === "veg" ? item.isVegetarian : !item.isVegetarian;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => updateItem(index, { isVegetarian: type === "veg" })}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {type === "veg" ? "Veg" : "Non-veg"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {items.length > 1 ? (
            <TouchableOpacity onPress={() => removeItem(index)}>
              <Text style={styles.removeText}>Remove item</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={items.length >= 10}>
        <Text style={styles.addBtnText}>{items.length >= 10 ? "Maximum 10 items in onboarding" : "+ Add another item"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  card: {
    backgroundColor: partnerTheme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 14,
    marginBottom: 12
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: partnerTheme.colors.primaryDark, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.card,
    marginBottom: 12
  },
  chipRow: { flexDirection: "row", marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    marginRight: 8
  },
  chipSelected: { backgroundColor: partnerTheme.colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark },
  chipTextSelected: { color: "#fff" },
  removeText: { color: "#F87171", fontWeight: "700", fontSize: 13 },
  addBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    alignItems: "center",
    paddingVertical: 14
  },
  addBtnText: { color: partnerTheme.colors.primary, fontWeight: "800" }
});
