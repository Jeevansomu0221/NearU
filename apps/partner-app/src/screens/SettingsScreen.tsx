import React, { useCallback, useEffect, useState } from "react";
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import api from "../api/client";
import { logout } from "../api/auth.api";
import { getStoredPartnerUser, isStaffActor } from "../utils/partnerActor";
import DeleteAccountModal from "../components/DeleteAccountModal";
import PartnerAgreementModal from "../components/PartnerAgreementModal";
import { getMyDeletionRequest } from "../api/accountDeletion.api";
import { openAccountDeletionReview } from "../utils/accountDeletionNavigation";
import { usePartnerTheme } from "../context/PartnerThemeContext";
import { buildLegalUrl, OFFICIAL_SITE_URL } from "../constants/legal";
import { androidKeyboardPadding, useKeyboardBottomInset } from "../hooks/useKeyboardBottomInset";

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

type DeliveryMode = "platform" | "self" | "self_free";

type SettingsState = {
  estimatedPrepTime: string;
  deliveryMode: DeliveryMode;
  selfDeliveryPartners: SelfDeliveryPartner[];
  darkMode: boolean;
  newOrderAlerts: boolean;
  paymentAlerts: boolean;
  promotionalNotifications: boolean;
  language: string;
};

const normalizeDeliveryMode = (value: unknown): DeliveryMode => {
  if (value === "self_free" || value === "self") return value;
  return "platform";
};

const deliveryModeLabel = (mode: DeliveryMode) => {
  if (mode === "self_free") return "Free self";
  if (mode === "self") return "Self";
  return "Platform";
};

export default function SettingsScreen({ navigation, route }: any) {
  const { isDarkMode, setDarkMode } = usePartnerTheme();
  const keyboardHeight = useKeyboardBottomInset();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [staffName, setStaffName] = useState("Staff");
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [agreementModalVisible, setAgreementModalVisible] = useState(false);
  const [profileMeta, setProfileMeta] = useState({
    restaurantName: "Your shop",
    status: "",
    phone: ""
  });
  const [settings, setSettings] = useState<SettingsState>({
    estimatedPrepTime: "20",
    deliveryMode: "platform" as DeliveryMode,
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
      const actor = await getStoredPartnerUser();
      const staffSession = isStaffActor(actor);
      setIsStaff(staffSession);
      setStaffName(actor?.operatorName || actor?.name || actor?.username || "Staff");
      if (staffSession) {
        return;
      }
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
            phone: String(partner.phone || "").replace(/\D/g, "").slice(-10),
            name: partner.name || "",
            isActive: partner.isActive !== false
          }))
        : [];
      setSettings({
        estimatedPrepTime: String(data.settings?.estimatedPrepTime ?? 20),
        deliveryMode: normalizeDeliveryMode(data.settings?.deliveryMode),
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
    const phone = value.replace(/\D/g, "").slice(0, 10);
    setSavedKey((prev) => (prev === "delivery" ? null : prev));
    setSettings((prev) => ({
      ...prev,
      selfDeliveryPartners: prev.selfDeliveryPartners.map((partner, partnerIndex) =>
        partnerIndex === index ? { ...partner, phone } : partner
      )
    }));
  };

  const addSelfDeliveryPartner = () => {
    setSavedKey((prev) => (prev === "delivery" ? null : prev));
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
    setSavedKey((prev) => (prev === "delivery" ? null : prev));
    setSettings((prev) => ({
      ...prev,
      selfDeliveryPartners: prev.selfDeliveryPartners.filter((_, partnerIndex) => partnerIndex !== index)
    }));
  };

  const saveAllSettings = async (key?: string) => {
    const prepTime = Number(settings.estimatedPrepTime);
    const selfDeliveryPartners = settings.selfDeliveryPartners
      .map((partner) => ({ ...partner, phone: partner.phone.trim() }))
      .filter((partner) => partner.phone.length > 0)
      .slice(0, 5);

    if (!Number.isFinite(prepTime) || prepTime <= 0) {
      Alert.alert("Prep time", "Enter valid estimated prep time in minutes.");
      return;
    }
    if (
      (settings.deliveryMode === "self" || settings.deliveryMode === "self_free") &&
      selfDeliveryPartners.length === 0
    ) {
      Alert.alert(
        settings.deliveryMode === "self_free" ? "Free self delivery" : "Self delivery",
        "Add at least one delivery-app rider phone number before enabling this delivery mode."
      );
      return;
    }
    const invalidRiderPhone = selfDeliveryPartners.find((partner) => partner.phone.length !== 10);
    if (
      (settings.deliveryMode === "self" || settings.deliveryMode === "self_free") &&
      invalidRiderPhone
    ) {
      Alert.alert("Invalid phone", "Each delivery rider phone must be a 10-digit mobile number.");
      return;
    }

    try {
      setSaving(true);
      setSavingKey(key || null);
      setSavedKey(null);
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
      if (key) {
        setSavedKey(key);
      } else {
        Alert.alert("Saved", "Settings updated successfully");
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || error.message || "Failed to save settings");
    } finally {
      setSaving(false);
      setSavingKey(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleDeleteAccount = async () => {
    try {
      const request = await getMyDeletionRequest();
      if (request && ["PENDING", "APPROVED"].includes(request.status)) {
        openAccountDeletionReview(navigation);
        return;
      }
    } catch {
      // fall through to modal
    }
    setDeleteAccountModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.openDeleteAccount) {
        setDeleteAccountModalVisible(true);
        navigation.setParams({ openDeleteAccount: undefined });
      }
    }, [navigation, route?.params?.openDeleteAccount])
  );

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
    </View>
  );

  const renderSaveButton = (label = "Save settings", key = "settings") => {
    const isThisSaving = saving && savingKey === key;
    const isThisSaved = !saving && savedKey === key;

    return (
      <TouchableOpacity
        style={[
          styles.sectionSaveButton,
          isThisSaved && styles.sectionSaveButtonSaved,
          saving && styles.sectionSaveButtonDisabled
        ]}
        onPress={() => void saveAllSettings(key)}
        disabled={saving || isThisSaved}
        activeOpacity={0.85}
      >
        {isThisSaving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons
              name={isThisSaved ? "checkmark-circle" : "checkmark-circle-outline"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.sectionSaveButtonText}>{isThisSaved ? "Saved" : label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

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
    <>
    <KeyboardAvoidingView
      style={[styles.container, isDark && styles.containerDark]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
    <ScrollView
      style={[styles.container, isDark && styles.containerDark]}
      contentContainerStyle={[styles.content, { paddingBottom: 28 + androidKeyboardPadding(keyboardHeight) }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{isStaff ? "Staff session" : "Business controls"}</Text>
            <Text style={styles.heroTitle}>{isStaff ? staffName : profileMeta.restaurantName}</Text>
            <Text style={styles.heroSubtitle}>
              {isStaff
                ? "You can manage live orders. Shop wallet and profile stay with the owner."
                : `${profileMeta.status ? `${profileMeta.status} partner` : "Partner settings"} ${profileMeta.phone ? `- ${profileMeta.phone}` : ""}`}
            </Text>
          </View>
        </View>
        {isStaff ? null : (
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{settings.estimatedPrepTime || "20"} min</Text>
            <Text style={styles.heroStatLabel}>Prep time</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{deliveryModeLabel(settings.deliveryMode)}</Text>
            <Text style={styles.heroStatLabel}>Delivery</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{settings.darkMode ? "Dark" : "Light"}</Text>
            <Text style={styles.heroStatLabel}>Theme</Text>
          </View>
        </View>
        )}
      </View>

      {isStaff ? null : (
      <>
      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Order Controls", "Set preparation time used for incoming orders.", "receipt-outline")}
        <Text style={[styles.label, isDark && styles.textDark]}>Estimated prep time (min)</Text>
        <TextInput
          style={[styles.input, isDark && styles.inputDark]}
          value={settings.estimatedPrepTime}
          onChangeText={(value) => {
            setSavedKey((prev) => (prev === "prep" ? null : prev));
            setSettings((prev) => ({ ...prev, estimatedPrepTime: value.replace(/\D/g, "") }));
          }}
          keyboardType="number-pad"
          maxLength={3}
        />
        {renderSaveButton("Save prep time", "prep")}
      </View>

      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Delivery Setup", "Choose platform, self, or free self delivery.", "bicycle-outline")}
        <View style={styles.choiceRow}>
          {(
            [
              { key: "platform" as const, label: "Platform delivery" },
              { key: "self" as const, label: "Self delivery" },
              { key: "self_free" as const, label: "Free self delivery" }
            ] as const
          ).map((mode) => {
            const selected = settings.deliveryMode === mode.key;
            return (
              <TouchableOpacity
                key={mode.key}
                style={[styles.choicePill, isDark && styles.choicePillDark, selected && styles.choicePillSelected]}
                onPress={() => {
                  setSavedKey((prev) => (prev === "delivery" ? null : prev));
                  setSettings((prev) => ({ ...prev, deliveryMode: mode.key }));
                }}
              >
                <Text style={[styles.choiceText, isDark && styles.mutedTextDark, selected && styles.choiceTextSelected]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(settings.deliveryMode === "self" || settings.deliveryMode === "self_free") && (
          <View
            style={[
              styles.selfDeliveryBox,
              isDark && styles.selfDeliveryBoxDark,
              settings.deliveryMode === "self_free" && styles.selfDeliveryBoxFree,
              settings.deliveryMode === "self_free" && isDark && styles.selfDeliveryBoxFreeDark
            ]}
          >
            {settings.deliveryMode === "self_free" ? (
              <View style={[styles.freeDeliveryBadge, isDark && styles.freeDeliveryBadgeDark]}>
                <Ionicons name="gift-outline" size={14} color="#1c9b55" />
                <Text style={styles.freeDeliveryBadgeText}>Customers see free delivery on your shop</Text>
              </View>
            ) : null}
            <Text style={[styles.selfDeliveryTitle, isDark && styles.textDark]}>Self delivery riders</Text>
            <View style={[styles.vyahaDeliveryNote, isDark && styles.vyahaDeliveryNoteDark]}>
              <Ionicons name="phone-portrait-outline" size={16} color={isDark ? "#9ECBFF" : "#1D4E89"} />
              <Text style={[styles.vyahaDeliveryNoteText, isDark && styles.mutedTextDark]}>
                Each phone number must be registered in the Vyaha Delivery app.
              </Text>
            </View>
            <Text style={[styles.helperText, isDark && styles.mutedTextDark]}>
              {settings.deliveryMode === "self_free"
                ? "Customers pay ₹0 delivery fee. Listed riders get 15 minutes to accept; if they do not, the order is cancelled (no platform fallback)."
                : "Listed riders get 5 minutes to accept each order before it opens to platform delivery."}
            </Text>
            {settings.selfDeliveryPartners.map((partner, index) => (
              <View key={`${partner.userId || partner.deliveryPartnerId || "new"}-${index}`} style={styles.riderRow}>
                <View style={styles.riderInputWrap}>
                  <Text style={[styles.riderInputLabel, isDark && styles.mutedTextDark]}>Vyaha Delivery rider</Text>
                  <TextInput
                    style={[styles.riderInput, isDark && styles.inputDark]}
                    value={partner.phone}
                    onChangeText={(value) => updateSelfDeliveryPartnerPhone(index, value)}
                    keyboardType="phone-pad"
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#98A2B3"
                    maxLength={10}
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
        <Text style={[styles.saveFlowHint, isDark && styles.mutedTextDark]}>
          {settings.deliveryMode === "platform"
            ? "Tap save to apply your delivery choice."
            : "Tap save when you finish choosing delivery mode and rider numbers."}
        </Text>
        {renderSaveButton("Save delivery setup", "delivery")}
      </View>
      </>
      )}

      {isStaff ? null : (
      <View style={[styles.card, isDark && styles.cardDark]}>
        {renderSectionTitle("Staff logins", "Create shared kitchen logins and track who signed in.", "people-outline")}
        <TouchableOpacity
          style={[styles.staffBtn, isDark && styles.staffBtnDark]}
          onPress={() => navigation.navigate("StaffAccounts")}
          activeOpacity={0.7}
        >
          <Ionicons name="key-outline" size={16} color={isDark ? "#9ECBFF" : "#1D4E89"} />
          <Text style={[styles.staffBtnText, isDark && styles.staffBtnTextDark]}>Manage staff accounts</Text>
          <Ionicons name="chevron-forward" size={16} color={isDark ? "#667085" : "#98A2B3"} />
        </TouchableOpacity>
      </View>
      )}

      <View style={[styles.card, isDark && styles.cardDark]}>
        {isStaff ? (
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, isDark && styles.textDark]}>Appearance</Text>
        ) : (
          renderSectionTitle("Appearance", "Personalize how the partner app feels on this device.", "moon-outline")
        )}
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

      {isStaff ? null : (
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
        {renderSaveButton("Save notification settings", "notifications")}
      </View>
      )}

      <View style={[styles.card, isDark && styles.cardDark]}>
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, isDark && styles.textDark]}>Legal</Text>
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={() => setAgreementModalVisible(true)}>
          <Text style={[styles.rowText, isDark && styles.textDark]}>Agreement</Text>
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
        {isStaff ? null : (
        <TouchableOpacity style={[styles.row, isDark && styles.rowDark]} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
        )}
      </View>

    </ScrollView>
    </KeyboardAvoidingView>
    <DeleteAccountModal
      visible={deleteAccountModalVisible}
      onClose={() => setDeleteAccountModalVisible(false)}
      isDark={isDark}
      onSubmitted={() => openAccountDeletionReview(navigation)}
    />
    <PartnerAgreementModal visible={agreementModalVisible} onClose={() => setAgreementModalVisible(false)} />
    </>
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
  title: { fontSize: 24, fontWeight: "800", color: "#2A5580", marginBottom: 14 },
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
  saveFlowHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 17,
    color: "#5E7897"
  },
  sectionSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  sectionSaveButtonSaved: {
    backgroundColor: "#15803D"
  },
  sectionSaveButtonDisabled: { backgroundColor: "#9FC8FF" },
  sectionSaveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
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
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#2A5580" },
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
  selfDeliveryBoxFree: {
    borderColor: "#9FE3BC",
    backgroundColor: "#F3FFF8"
  },
  selfDeliveryBoxFreeDark: {
    borderColor: "#1F5A3A",
    backgroundColor: "#0D1A14"
  },
  freeDeliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F8EF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 6
  },
  freeDeliveryBadgeDark: {
    backgroundColor: "#143024"
  },
  freeDeliveryBadgeText: {
    color: "#1c9b55",
    fontSize: 12,
    fontWeight: "800"
  },
  vyahaDeliveryNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8
  },
  vyahaDeliveryNoteDark: {
    backgroundColor: "#132033",
    borderColor: "#263449"
  },
  vyahaDeliveryNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: "#355877",
    fontWeight: "700"
  },
  selfDeliveryTitle: { fontSize: 13, color: "#2A5580", fontWeight: "800", marginBottom: 4 },
  riderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  riderInputWrap: { flex: 1 },
  riderInputLabel: {
    fontSize: 11,
    color: "#5E7897",
    fontWeight: "800",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3
  },
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
  removeRiderText: { color: "#F87171", fontSize: 12, fontWeight: "800" },
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
  row: {
    minHeight: 52,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E6EEF9"
  },
  rowDark: { borderBottomColor: "#263449" },
  rowText: { fontSize: 14, fontWeight: "700", color: "#2A5580" },
  logoutText: { fontSize: 14, fontWeight: "800", color: "#60A5FA" },
  deleteText: { fontSize: 14, fontWeight: "800", color: "#F87171" },
  staffBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EBF4FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 4
  },
  staffBtnDark: { backgroundColor: "#1A2D42" },
  staffBtnText: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1D4E89" },
  staffBtnTextDark: { color: "#9ECBFF" }
});
