import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  createPartnerStaff,
  disablePartnerStaff,
  getPartnerStaffLoginActivity,
  listPartnerStaff,
  updatePartnerStaff,
  type PartnerStaffAccount,
  type PartnerStaffLoginActivity
} from "../api/partner.api";
import { usePartnerTheme } from "../context/PartnerThemeContext";

const staffApiError = (error: any, fallback: string) => {
  const message = error?.response?.data?.message || error?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

const formatWhen = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

function PasswordField({
  value,
  onChangeText,
  placeholder,
  dark
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  dark: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.passwordRow, dark && styles.inputDark]}>
      <TextInput
        style={[styles.passwordInput, dark && styles.passwordInputDark]}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={onChangeText}
      />
      <TouchableOpacity onPress={() => setVisible((current) => !current)} hitSlop={8}>
        <Text style={styles.showHide}>{visible ? "Hide" : "Show"}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function StaffAccountsScreen() {
  const { isDarkMode } = usePartnerTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState<PartnerStaffAccount | null>(null);
  const [activity, setActivity] = useState<PartnerStaffLoginActivity[]>([]);
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [resetForm, setResetForm] = useState({ password: "", confirmPassword: "" });

  const load = async () => {
    try {
      setLoading(true);
      const [staffRes, activityRes] = await Promise.all([
        listPartnerStaff(),
        getPartnerStaffLoginActivity({ limit: 25 })
      ]);
      const accounts = Array.isArray(staffRes.data?.data) ? staffRes.data.data : [];
      setShared(accounts[0] || null);
      setActivity(Array.isArray(activityRes.data?.data) ? activityRes.data.data : []);
    } catch {
      setShared(null);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async () => {
    const username = form.username.trim().toLowerCase();
    if (!username) {
      Alert.alert("Missing username", "Enter a username like kitchen01.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert("Passwords do not match", "Type the same password in both fields.");
      return;
    }
    try {
      setSaving(true);
      const res = await createPartnerStaff({
        username,
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || "Could not create kitchen login");
      }
      Alert.alert(
        "Kitchen login created",
        `Share username ${username} and this password with your team. Each person will type their own name when they sign in.`
      );
      setForm({ username: "", password: "", confirmPassword: "" });
      await load();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || "Could not create kitchen login";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    if (!shared) return;
    try {
      await updatePartnerStaff(shared._id, { isActive: !shared.isActive });
      await load();
    } catch (error: any) {
      Alert.alert("Error", staffApiError(error, "Could not update kitchen login"));
    }
  };

  const onResetPassword = async () => {
    if (!shared) return;
    if (resetForm.password !== resetForm.confirmPassword) {
      Alert.alert("Passwords do not match", "Type the same password in both fields.");
      return;
    }
    try {
      await updatePartnerStaff(shared._id, {
        password: resetForm.password,
        confirmPassword: resetForm.confirmPassword
      });
      Alert.alert("Updated", "Anyone using the old password will need to sign in again.");
      setResetForm({ password: "", confirmPassword: "" });
      await load();
    } catch (error: any) {
      Alert.alert("Error", staffApiError(error, "Could not reset password"));
    }
  };

  const onDisable = () => {
    if (!shared) return;
    Alert.alert("Disable kitchen login", "Everyone using this login will be signed out.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable",
        style: "destructive",
        onPress: async () => {
          try {
            await disablePartnerStaff(shared._id);
            await load();
          } catch (error: any) {
            Alert.alert("Error", staffApiError(error, "Could not disable kitchen login"));
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={[styles.loadingText, isDarkMode && styles.muted]}>Loading kitchen login...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, isDarkMode && styles.text]}>Kitchen login</Text>
      <Text style={[styles.subtitle, isDarkMode && styles.muted]}>
        One username and password for the whole team. Each person types their name when they sign in, and you will see
        who is handling orders.
      </Text>

      {shared ? (
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.text]}>Shared login</Text>
          <Text style={[styles.staffName, isDarkMode && styles.text]}>@{shared.username}</Text>
          <Text style={[styles.staffMeta, isDarkMode && styles.muted]}>
            {shared.isActive ? "Active" : "Disabled"}
            {shared.lastOperatorName
              ? ` · Last used by ${shared.lastOperatorName} · ${formatWhen(shared.lastLoginAt)}`
              : " · Not used yet"}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onToggle}>
              <Text style={styles.link}>{shared.isActive ? "Disable" : "Enable"}</Text>
            </TouchableOpacity>
            {shared.isActive ? (
              <TouchableOpacity onPress={onDisable}>
                <Text style={styles.danger}>Sign everyone out</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={[styles.fieldLabel, isDarkMode && styles.muted]}>New password</Text>
          <PasswordField
            value={resetForm.password}
            onChangeText={(password) => setResetForm((current) => ({ ...current, password }))}
            placeholder="New password"
            dark={isDarkMode}
          />
          <Text style={[styles.fieldLabel, isDarkMode && styles.muted]}>Confirm password</Text>
          <PasswordField
            value={resetForm.confirmPassword}
            onChangeText={(confirmPassword) => setResetForm((current) => ({ ...current, confirmPassword }))}
            placeholder="Type it again"
            dark={isDarkMode}
          />
          <TouchableOpacity onPress={onResetPassword}>
            <Text style={styles.link}>Save new password</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.card, isDarkMode && styles.cardDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.text]}>Create shared login</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="Username (kitchen01)"
            placeholderTextColor="#98A2B3"
            autoCapitalize="none"
            value={form.username}
            onChangeText={(username) => setForm((current) => ({ ...current, username: username.toLowerCase() }))}
          />
          <PasswordField
            value={form.password}
            onChangeText={(password) => setForm((current) => ({ ...current, password }))}
            placeholder="Password (8+ characters)"
            dark={isDarkMode}
          />
          <PasswordField
            value={form.confirmPassword}
            onChangeText={(confirmPassword) => setForm((current) => ({ ...current, confirmPassword }))}
            placeholder="Confirm password"
            dark={isDarkMode}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={onCreate} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create login</Text>}
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.text]}>Who signed in</Text>
        {activity.length === 0 ? (
          <Text style={[styles.empty, isDarkMode && styles.muted]}>No sign-in activity yet.</Text>
        ) : (
          activity.map((item) => (
            <View key={item._id} style={styles.activityRow}>
              <Text style={[styles.staffName, isDarkMode && styles.text]}>
                {item.displayName || "Staff"} · {item.success ? item.event.replace("_", " ") : "failed login"}
              </Text>
              <Text style={[styles.staffMeta, isDarkMode && styles.muted]}>
                {item.platform && item.platform !== "unknown" ? `${item.platform} · ` : ""}
                {formatWhen(item.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FF" },
  containerDark: { backgroundColor: "#0B1220" },
  content: { padding: 16, paddingBottom: 32 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F8FF" },
  loadingText: { marginTop: 10, color: "#5E7897" },
  title: { fontSize: 24, fontWeight: "800", color: "#2A5580" },
  subtitle: { marginTop: 6, marginBottom: 14, fontSize: 13, lineHeight: 18, color: "#5E7897" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E6F7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12
  },
  cardDark: { backgroundColor: "#111827", borderColor: "#263449" },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#2A5580", marginBottom: 10 },
  text: { color: "#E5EDF7" },
  muted: { color: "#9FB0C5" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#5E7897", marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
    backgroundColor: "#F9FCFF",
    color: "#123456"
  },
  inputDark: { backgroundColor: "#0B1220", borderColor: "#263449", color: "#E5EDF7" },
  passwordRow: {
    borderWidth: 1,
    borderColor: "#CFE0F5",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "#F9FCFF",
    flexDirection: "row",
    alignItems: "center"
  },
  passwordInput: { flex: 1, paddingVertical: 11, color: "#123456" },
  passwordInputDark: { color: "#E5EDF7" },
  showHide: { color: "#60A5FA", fontWeight: "800", paddingLeft: 8 },
  primaryButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center"
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  empty: { color: "#5E7897" },
  activityRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E6EEF9" },
  staffName: { fontSize: 14, fontWeight: "800", color: "#2A5580" },
  staffMeta: { marginTop: 3, fontSize: 12, color: "#5E7897" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8, marginBottom: 10 },
  link: { color: "#60A5FA", fontWeight: "800", marginTop: 4 },
  danger: { color: "#F87171", fontWeight: "800" }
});
