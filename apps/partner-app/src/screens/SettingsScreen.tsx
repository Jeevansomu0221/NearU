import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ActivityIndicator
} from "react-native";
import api from "../api/client";
import { deleteAccount, logout } from "../api/auth.api";

const PRIVACY_URL = "https://vyaha-app-backend.onrender.com/legal/privacy";
const TERMS_URL = "https://vyaha-app-backend.onrender.com/legal/terms";
const DELETE_URL = "https://vyaha-app-backend.onrender.com/legal/delete-account";

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" }
];

export default function SettingsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    autoAcceptOrders: false,
    estimatedPrepTime: "20",
    deliveryMode: "platform" as "platform" | "self",
    deliveryRadiusKm: "3",
    minimumOrderAmount: "0",
    upiId: "",
    newOrderAlerts: true,
    paymentAlerts: true,
    promotionalNotifications: false,
    language: "en"
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/partners/profile");
      const payload = res.data as { success: boolean; data?: any };
      if (!payload.success || !payload.data) {
        throw new Error(payload?.data?.message || "Failed to load settings");
      }

      const data = payload.data;
      setSettings({
        autoAcceptOrders: Boolean(data.settings?.autoAcceptOrders),
        estimatedPrepTime: String(data.settings?.estimatedPrepTime ?? 20),
        deliveryMode: data.settings?.deliveryMode === "self" ? "self" : "platform",
        deliveryRadiusKm: String(data.settings?.deliveryRadiusKm ?? 3),
        minimumOrderAmount: String(data.settings?.minimumOrderAmount ?? 0),
        upiId: data.settings?.upiId || "",
        newOrderAlerts: data.notifications?.newOrderAlerts !== false,
        paymentAlerts: data.notifications?.paymentAlerts !== false,
        promotionalNotifications: Boolean(data.notifications?.promotionalNotifications),
        language: data.language || "en"
      });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveAllSettings = async () => {
    const prepTime = Number(settings.estimatedPrepTime);
    const radius = Number(settings.deliveryRadiusKm);
    const minOrder = Number(settings.minimumOrderAmount);
    if (!Number.isFinite(prepTime) || prepTime <= 0) {
      Alert.alert("Prep time", "Enter valid estimated prep time in minutes.");
      return;
    }
    if (!Number.isFinite(radius) || radius <= 0) {
      Alert.alert("Delivery radius", "Enter valid delivery radius in km.");
      return;
    }
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      Alert.alert("Minimum order", "Enter valid minimum order amount.");
      return;
    }

    try {
      setSaving(true);
      await api.put("/partners/profile", {
        settings: {
          autoAcceptOrders: settings.autoAcceptOrders,
          estimatedPrepTime: Math.round(prepTime),
          deliveryMode: settings.deliveryMode,
          deliveryRadiusKm: radius,
          minimumOrderAmount: minOrder,
          upiId: settings.upiId.trim()
        },
        notifications: {
          newOrderAlerts: settings.newOrderAlerts,
          paymentAlerts: settings.paymentAlerts,
          promotionalNotifications: settings.promotionalNotifications
        },
        language: settings.language
      });
      Alert.alert("Saved", "Settings updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This will deactivate your partner login and anonymize profile, business, document, and payout details where possible. Some order, tax, payout, or dispute records may be retained where required.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.message || error.message || "Failed to delete account");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2F80ED" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order</Text>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Auto accept orders</Text>
          <Switch
            value={settings.autoAcceptOrders}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, autoAcceptOrders: value }))}
          />
        </View>
        <Text style={styles.label}>Estimated prep time (min)</Text>
        <TextInput
          style={styles.input}
          value={settings.estimatedPrepTime}
          onChangeText={(value) => setSettings((prev) => ({ ...prev, estimatedPrepTime: value.replace(/\D/g, "") }))}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery</Text>
        <View style={styles.choiceRow}>
          {(["platform", "self"] as const).map((mode) => {
            const selected = settings.deliveryMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.choicePill, selected && styles.choicePillSelected]}
                onPress={() => setSettings((prev) => ({ ...prev, deliveryMode: mode }))}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                  {mode === "platform" ? "Platform delivery" : "Self delivery"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Delivery radius (km)</Text>
        <TextInput
          style={styles.input}
          value={settings.deliveryRadiusKm}
          onChangeText={(value) => setSettings((prev) => ({ ...prev, deliveryRadiusKm: value.replace(/[^0-9.]/g, "") }))}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Minimum order amount (Rs)</Text>
        <TextInput
          style={styles.input}
          value={settings.minimumOrderAmount}
          onChangeText={(value) => setSettings((prev) => ({ ...prev, minimumOrderAmount: value.replace(/[^0-9.]/g, "") }))}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment & Notifications</Text>
        <Text style={styles.label}>UPI payout ID</Text>
        <TextInput
          style={styles.input}
          value={settings.upiId}
          onChangeText={(value) => setSettings((prev) => ({ ...prev, upiId: value }))}
          autoCapitalize="none"
          placeholder="yourname@upi"
          placeholderTextColor="#98A2B3"
        />
        <View style={styles.switchRow}>
          <Text style={styles.label}>New order alerts</Text>
          <Switch
            value={settings.newOrderAlerts}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, newOrderAlerts: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Payment alerts</Text>
          <Switch
            value={settings.paymentAlerts}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, paymentAlerts: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Promotional notifications</Text>
          <Switch
            value={settings.promotionalNotifications}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, promotionalNotifications: value }))}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Language</Text>
        <View style={styles.choiceRow}>
          {LANGUAGES.map((item) => {
            const selected = settings.language === item.code;
            return (
              <TouchableOpacity
                key={item.code}
                style={[styles.choicePill, selected && styles.choicePillSelected]}
                onPress={() => setSettings((prev) => ({ ...prev, language: item.code }))}
              >
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveAllSettings} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>Save Settings</Text>}
      </TouchableOpacity>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.rowText}>Terms & Conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.rowText}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(DELETE_URL)}>
          <Text style={styles.rowText}>Account Deletion Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FF" },
  content: { padding: 16, paddingBottom: 28 },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: { marginTop: 10, color: "#5E7897", fontSize: 14 },
  title: { fontSize: 24, fontWeight: "800", color: "#143A66", marginBottom: 14 },
  card: {
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    padding: 14
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#143A66", marginBottom: 10 },
  label: { fontSize: 13, color: "#355877", fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#123456",
    backgroundColor: "#F9FCFF",
    marginTop: 6,
    marginBottom: 10
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  choicePill: {
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  choicePillSelected: { backgroundColor: "#2F80ED" },
  choiceText: { fontSize: 12, color: "#355877", fontWeight: "700" },
  choiceTextSelected: { color: "#FFFFFF" },
  saveButton: {
    backgroundColor: "#2F80ED",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 12
  },
  saveButtonDisabled: { backgroundColor: "#9FC8FF" },
  saveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  row: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  rowText: { fontSize: 14, fontWeight: "700", color: "#143A66" },
  logoutText: { fontSize: 14, fontWeight: "800", color: "#2F80ED" },
  deleteText: { fontSize: 14, fontWeight: "800", color: "#B42318" }
});