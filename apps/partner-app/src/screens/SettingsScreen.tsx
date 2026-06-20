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
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { deleteAccount, logout } from "../api/auth.api";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import { buildLegalUrl, OFFICIAL_SITE_URL } from "../constants/legal";

const PARTNER_POLICY_URL = `${OFFICIAL_SITE_URL}/partner-policy`;
const TERMS_URL = buildLegalUrl("terms");
const DELETE_URL = buildLegalUrl("delete-account");

type SelfDeliveryPartner = {
  deliveryPartnerId?: string;
  userId?: string;
  phone: string;
  name?: string;
  isActive?: boolean;
};

type SettingsState = {
  estimatedPrepTime: string;
  deliveryMode: "platform" | "self";
  selfDeliveryPartners: SelfDeliveryPartner[];
  darkMode: boolean;
  newOrderAlerts: boolean;
  paymentAlerts: boolean;
  promotionalNotifications: boolean;
  language: string;
};

export default function SettingsScreen({ navigation }: any) {
  const { isDarkMode, setDarkMode } = usePartnerTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMeta, setProfileMeta] = useState({
    restaurantName: "Your shop",
    status: "",
    phone: ""
  });
  const [settings, setSettings] = useState<SettingsState>({
    estimatedPrepTime: "20",
    deliveryMode: "platform" as "platform" | "self",
    selfDeliveryPartners: [],
    darkMode: isDarkMode,
    newOrderAlerts: true,
    paymentAlerts: true,
    promotionalNotifications: false,
    language: "en"
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setSettings((prev) => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/partners/profile");
      const payload = res.data as { success: boolean; data?: any };
      if (!payload.success || !payload.data) {
        throw new Error(payload?.data?.message || "Failed to load settings");
      }

      const data = payload.data;
      setProfileMeta({
        restaurantName: data.restaurantName || data.shopName || "Your shop",
        status: data.status || "",
        phone: data.phone || ""
      });
      const selfDeliveryPartners = Array.isArray(data.settings?.selfDeliveryPartners)
        ? data.settings.selfDeliveryPartners.slice(0, 5).map((partner: any) => ({
            deliveryPartnerId: partner.deliveryPartnerId,
            userId: partner.userId,
            phone: String(partner.phone || ""),
            name: partner.name || "",
            isActive: partner.isActive !== false
          }))
        : [];
      setSettings({
        estimatedPrepTime: String(data.settings?.estimatedPrepTime ?? 20),
        deliveryMode: data.settings?.deliveryMode === "self" ? "self" : "platform",
        selfDeliveryPartners,
        darkMode: isDarkMode,
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

  const updateSelfDeliveryPartnerPhone = (index: number, value: string) => {
    const phone = value.replace(/[^\d+]/g, "").slice(0, 16);
    setSettings((prev) => ({
      ...prev,
      selfDeliveryPartners: prev.selfDeliveryPartners.map((partner, partnerIndex) =>
        partnerIndex === index ? { ...partner, phone } : partner
      )
    }));
  };

  const addSelfDeliveryPartner = () => {
    setSettings((prev) => {
      if (prev.selfDeliveryPartners.length >= 5) {
        Alert.alert("Limit reached", "You can add maximum 5 self delivery partners for this shop.");
        return prev;
      }

      return {
        ...prev,
        selfDeliveryPartners: [...prev.selfDeliveryPartners, { phone: "" }]
      };
    });
  };

  const removeSelfDeliveryPartner = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      selfDeliveryPartners: prev.selfDeliveryPartners.filter((_, partnerIndex) => partnerIndex !== index)
    }));
  };

  const saveAllSettings = async () => {
    const prepTime = Number(settings.estimatedPrepTime);
    const selfDeliveryPartners = settings.selfDeliveryPartners
      .map((partner) => ({ ...partner, phone: partner.phone.trim() }))
      .filter((partner) => partner.phone.length > 0)
      .slice(0, 5);

    if (!Number.isFinite(prepTime) || prepTime <= 0) {
      Alert.alert("Prep time", "Enter valid estimated prep time in minutes.");
      return;
    }
    if (settings.deliveryMode === "self" && selfDeliveryPartners.length === 0) {
      Alert.alert("Self delivery", "Add at least one delivery-app rider phone number before enabling self delivery.");
      return;
    }

    try {
      setSaving(true);
      await api.put("/partners/profile", {
        settings: {
          estimatedPrepTime: Math.round(prepTime),
          deliveryMode: settings.deliveryMode,
          selfDeliveryPartners
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

  const renderSectionTitle = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleWrap}>
        <View style={[styles.sectionIconCircle, settings.darkMode && styles.sectionIconCircleDark]}>
          <Ionicons name={icon} size={17} color="#1D4E89" />
        </View>
        <View style={styles.sectionCopy}>
          <Text style={[styles.sectionTitle, settings.darkMode && styles.textDark]}>{title}</Text>
          <Text style={[styles.sectionSubtitle, settings.darkMode && styles.mutedTextDark]}>{subtitle}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.smallSaveButton, saving && styles.smallSaveButtonDisabled]}
        onPress={saveAllSettings}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.smallSaveButtonText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const isDark = settings.darkMode;

  return (
    <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Business controls</Text>
            <Text style={styles.heroTitle}>{profileMeta.restaurantName}</Text>
            <Text style={styles.heroSubtitle}>
              {profileMeta.status ? `${profileMeta.status} partner` : "Partner settings"} {profileMeta.phone ? `- ${profileMeta.phone}` : ""}
            </Text>
          </View>
        </View>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{settings.estimatedPrepTime || "20"} min</Text>
            <Text style={styles.heroStatLabel}>Prep time</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{settings.deliveryMode === "self" ? "Self" : "Platform"}</Text>
            <Text style={styles.heroStatLabel}>Delivery</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{settings.darkMode ? "Dark" : "Light"}</Text>
            <Text style={styles.heroStatLabel}>Theme</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Order Controls", "Set preparation time used for incoming orders.", "receipt-outline")}
        <Text style={[styles.label, isDark && styles.textDark]}>Estimated prep time (min)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={settings.estimatedPrepTime}
          onChangeText={(value) => setSettings((prev) => ({ ...prev, estimatedPrepTime: value.replace(/\D/g, "") }))}
          keyboardType="number-pad"
          maxLength={3}
        />
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Delivery Setup", "Choose platform delivery or assign your own riders.", "bicycle-outline")}
        <View style={styles.choiceRow}>
          {(["platform", "self"] as const).map((mode) => {
            const selected = settings.deliveryMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[styles.choicePill, isDark && styles.choicePillDark, selected && styles.choicePillSelected]}
                onPress={() => setSettings((prev) => ({ ...prev, deliveryMode: mode }))}
              >
                <Text style={[styles.choiceText, isDark && styles.mutedTextDark, selected && styles.choiceTextSelected]}>
                  {mode === "platform" ? "Platform delivery" : "Self delivery"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {settings.deliveryMode === "self" && (
          <View style={[styles.selfDeliveryBox, isDark && styles.selfDeliveryBoxDark]}>
            <Text style={[styles.selfDeliveryTitle, isDark && styles.textDark]}>Self delivery riders</Text>
            <Text style={[styles.helperText, isDark && styles.mutedTextDark]}>
              Add delivery-app phone numbers for this shop. These riders get 5 minutes to accept each READY order before it opens to platform delivery.
            </Text>
            {settings.selfDeliveryPartners.map((partner, index) => (
              <View key={`${partner.userId || partner.deliveryPartnerId || "new"}-${index}`} style={styles.riderRow}>
                <View style={styles.riderInputWrap}>
                  <TextInput
                    style={[styles.riderInput, isDark && styles.inputDark]}
                    value={partner.phone}
                    onChangeText={(value) => updateSelfDeliveryPartnerPhone(index, value)}
                    keyboardType="phone-pad"
                    placeholder="Delivery rider phone"
                    placeholderTextColor="#98A2B3"
                  />
                  {partner.name ? <Text style={styles.riderName}>{partner.name}</Text> : null}
                </View>
                <TouchableOpacity style={styles.removeRiderButton} onPress={() => removeSelfDeliveryPartner(index)}>
                  <Text style={styles.removeRiderText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[
                styles.addRiderButton,
                settings.selfDeliveryPartners.length >= 5 && styles.addRiderButtonDisabled
              ]}
              onPress={addSelfDeliveryPartner}
              disabled={settings.selfDeliveryPartners.length >= 5}
            >
              <Text style={styles.addRiderText}>
                {settings.selfDeliveryPartners.length >= 5 ? "Maximum 5 riders added" : "Add delivery rider"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Appearance", "Personalize how the partner app feels on this device.", "moon-outline")}
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.label, isDark && styles.textDark]}>Dark mode</Text>
            <Text style={[styles.helperTextCompact, isDark && styles.mutedTextDark]}>Reduces brightness for evening and night operations.</Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => {
              setSettings((prev) => ({ ...prev, darkMode: value }));
              setDarkMode(value).catch(() => undefined);
            }}
          />
        </View>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Notifications", "Control alerts that help your team respond on time.", "notifications-outline")}
        <View style={[styles.payoutLockBox, isDark && styles.infoBoxDark]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#1D4E89" />
          <Text style={[styles.payoutLockText, isDark && styles.mutedTextDark]}>
            Payout account changes are handled from Profile with a support reason after verification.
          </Text>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.label, isDark && styles.textDark]}>New order alerts</Text>
            <Text style={[styles.helperTextCompact, isDark && styles.mutedTextDark]}>Recommended for all active shops.</Text>
          </View>
          <Switch
            value={settings.newOrderAlerts}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, newOrderAlerts: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.label, isDark && styles.textDark]}>Payment alerts</Text>
            <Text style={[styles.helperTextCompact, isDark && styles.mutedTextDark]}>Get notified when payout and payment events change.</Text>
          </View>
          <Switch
            value={settings.paymentAlerts}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, paymentAlerts: value }))}
          />
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.label, isDark && styles.textDark]}>Promotional notifications</Text>
            <Text style={[styles.helperTextCompact, isDark && styles.mutedTextDark]}>Occasional campaigns, offers, and growth tips.</Text>
          </View>
          <Switch
            value={settings.promotionalNotifications}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, promotionalNotifications: value }))}
          />
        </View>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, isDark && styles.textDark]}>Legal</Text>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={[styles.rowText, isDark && styles.textDark]}>Terms & Conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={() => Linking.openURL(PARTNER_POLICY_URL)}>
          <Text style={[styles.rowText, isDark && styles.textDark]}>Partner Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={() => Linking.openURL(DELETE_URL)}>
          <Text style={[styles.rowText, isDark && styles.textDark]}>Account Deletion Policy</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, isDark && styles.textDark]}>Account</Text>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.footerSaveButton, saving && styles.smallSaveButtonDisabled]} onPress={saveAllSettings} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.footerSaveButtonText}>Save all settings</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FF" },
  containerDark: { backgroundColor: "#0B1220" },
  content: { padding: 16, paddingBottom: 28 },
  loadingWrap: {
    flex: 1,
    backgroundColor: "#F4F8FF",
    justifyContent: "center",
    alignItems: "center"
  },
  loadingText: { marginTop: 10, color: "#5E7897", fontSize: 14 },
  title: { fontSize: 24, fontWeight: "800", color: "#143A66", marginBottom: 14 },
  heroCard: {
    backgroundColor: "#1D4E89",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14
  },
  heroCardDark: { backgroundColor: "#111C2F" },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    marginRight: 12
  },
  heroCopy: {
    flex: 1
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: "#CFE0F5",
    textTransform: "uppercase"
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#DDEBFF"
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingVertical: 10
  },
  heroStat: {
    flex: 1,
    alignItems: "center"
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  heroStatLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#CFE0F5"
  },
  card: {
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    padding: 14
  },
  cardDark: {
    backgroundColor: "#111827",
    borderColor: "#263449"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12
  },
  sectionTitleWrap: { flex: 1, flexDirection: "row", alignItems: "flex-start", marginRight: 12 },
  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FF",
    marginRight: 10
  },
  sectionIconCircleDark: { backgroundColor: "#1D2A3D" },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#143A66" },
  sectionTitleStandalone: { marginBottom: 10 },
  sectionHeaderTitle: { flex: 1, marginRight: 12 },
  sectionSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 16, color: "#5E7897" },
  label: { fontSize: 13, color: "#355877", fontWeight: "700" },
  textDark: { color: "#E5EDF7" },
  mutedTextDark: { color: "#9FB0C5" },
  helperText: { fontSize: 12, color: "#5E7897", lineHeight: 17, marginBottom: 10 },
  helperTextCompact: { marginTop: 3, fontSize: 11.5, color: "#6A7F98", lineHeight: 15 },
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
  inputDark: {
    backgroundColor: "#0B1220",
    borderColor: "#263449",
    color: "#E5EDF7"
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  switchCopy: { flex: 1, marginRight: 12 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  choicePill: {
    backgroundColor: "#EAF3FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  choicePillDark: { backgroundColor: "#1D2A3D" },
  choicePillSelected: { backgroundColor: "#60A5FA" },
  choiceText: { fontSize: 12, color: "#355877", fontWeight: "700" },
  choiceTextSelected: { color: "#FFFFFF" },
  selfDeliveryBox: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    backgroundColor: "#F9FCFF",
    padding: 12,
    marginBottom: 12
  },
  selfDeliveryBoxDark: {
    backgroundColor: "#0B1220",
    borderColor: "#263449"
  },
  selfDeliveryTitle: { fontSize: 13, color: "#143A66", fontWeight: "800", marginBottom: 4 },
  riderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  riderInputWrap: { flex: 1 },
  riderInput: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#123456",
    backgroundColor: "#FFFFFF"
  },
  riderName: { marginTop: 4, fontSize: 12, color: "#5E7897", fontWeight: "700" },
  removeRiderButton: {
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FFD1D1",
    paddingHorizontal: 10,
    paddingVertical: 11
  },
  removeRiderText: { color: "#B42318", fontSize: 12, fontWeight: "800" },
  addRiderButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#60A5FA",
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    paddingVertical: 11
  },
  addRiderButtonDisabled: {
    borderColor: "#CFE0F5",
    backgroundColor: "#F2F6FB"
  },
  addRiderText: { color: "#60A5FA", fontSize: 13, fontWeight: "800" },
  payoutLockBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12
  },
  infoBoxDark: {
    backgroundColor: "#0B1220",
    borderColor: "#263449"
  },
  payoutLockText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    color: "#355877"
  },
  smallSaveButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  smallSaveButtonDisabled: { backgroundColor: "#9FC8FF" },
  smallSaveButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  row: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  rowDark: { borderBottomColor: "#263449" },
  rowText: { fontSize: 14, fontWeight: "700", color: "#143A66" },
  logoutText: { fontSize: 14, fontWeight: "800", color: "#60A5FA" },
  deleteText: { fontSize: 14, fontWeight: "800", color: "#B42318" },
  footerSaveButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    marginTop: 2
  },
  footerSaveButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }
});
