import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { partnerTheme } from "../../theme";
import { WEEKDAYS } from "./constants";

export type OperationsState = {
  openingTime: string;
  closingTime: string;
  weeklyHolidays: string[];
  deliveryMode: "self" | "platform";
  takeawayAvailable: boolean;
  packagingNote: string;
};

type Props = {
  operations: OperationsState;
  onChange: (next: OperationsState) => void;
};

export default function OperationsStep({ operations, onChange }: Props) {
  const toggleHoliday = (day: string) => {
    const has = operations.weeklyHolidays.includes(day);
    onChange({
      ...operations,
      weeklyHolidays: has ? operations.weeklyHolidays.filter((d) => d !== day) : [...operations.weeklyHolidays, day]
    });
  };

  return (
    <View>
      <Text style={styles.hint}>Set when customers can order and how you fulfil orders.</Text>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Opening time</Text>
          <TextInput
            style={styles.input}
            placeholder="08:00"
            placeholderTextColor="#98A2B3"
            value={operations.openingTime}
            onChangeText={(openingTime) => onChange({ ...operations, openingTime })}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Closing time</Text>
          <TextInput
            style={styles.input}
            placeholder="22:00"
            placeholderTextColor="#98A2B3"
            value={operations.closingTime}
            onChangeText={(closingTime) => onChange({ ...operations, closingTime })}
          />
        </View>
      </View>

      <Text style={styles.label}>Weekly off days</Text>
      <View style={styles.chipWrap}>
        {WEEKDAYS.map((day) => {
          const selected = operations.weeklyHolidays.includes(day);
          return (
            <TouchableOpacity key={day} style={[styles.chip, selected && styles.chipSelected]} onPress={() => toggleHoliday(day)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day.slice(0, 3)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Delivery fulfilment</Text>
      <View style={styles.chipWrap}>
        {([
          { key: "platform", label: "Vyaha delivery partners" },
          { key: "self", label: "Self delivery" }
        ] as const).map((option) => {
          const selected = operations.deliveryMode === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange({ ...operations, deliveryMode: option.key })}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Takeaway</Text>
      <View style={styles.chipWrap}>
        {([
          { key: true, label: "Takeaway available" },
          { key: false, label: "Delivery only" }
        ] as const).map((option) => {
          const selected = operations.takeawayAvailable === option.key;
          return (
            <TouchableOpacity
              key={String(option.key)}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange({ ...operations, takeawayAvailable: option.key })}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Packaging notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Eco-friendly boxes, separate gravy packing, etc."
        placeholderTextColor="#98A2B3"
        multiline
        value={operations.packagingNote}
        onChangeText={(packagingNote) => onChange({ ...operations, packagingNote })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: 12, fontSize: 13, lineHeight: 18, color: partnerTheme.colors.muted },
  label: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: partnerTheme.colors.text,
    backgroundColor: partnerTheme.colors.surface,
    marginBottom: 12
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  half: { flex: 1, marginRight: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: partnerTheme.colors.neutralSoft,
    marginRight: 8,
    marginBottom: 8
  },
  chipSelected: { backgroundColor: partnerTheme.colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: partnerTheme.colors.mutedDark },
  chipTextSelected: { color: "#fff" }
});
