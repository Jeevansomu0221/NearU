import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { DeliveryProfile } from "../api/profile.api";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  persistNotificationPreferences,
  type DeliveryNotificationPreferences
} from "../services/notificationPreferences";
import {
  checkAppUpdateStatus,
  getCurrentAppVersion,
  installOtaUpdate,
  openAppStoreListing,
  type AppUpdateStatus
} from "../utils/appUpdate";
import {
  getNotificationPermissionLabel,
  openNotificationSettings,
  registerForPushNotifications
} from "../services/notifications";

const GREEN_PRIMARY = "#16A34A";
const GREEN_DEEP = "#166534";
const GREEN_SOFT = "#DCFCE7";

export type SettingsModalType = "notifications" | "profile" | "appVersion" | null;

type Props = {
  visibleType: SettingsModalType;
  onClose: () => void;
  profile: DeliveryProfile | null;
  employeeId: string;
  profileName: string;
  profilePhone: string;
  profileEmail: string;
  vehicleType: string;
  vehicleNumber: string;
  verificationStatusLabel: string;
  onUpdateAvailableChange?: (available: boolean) => void;
};

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

const ToggleRow = ({ title, subtitle, value, onValueChange, disabled }: ToggleRowProps) => (
  <View style={styles.toggleRow}>
    <View style={styles.toggleCopy}>
      <Text style={styles.toggleTitle}>{title}</Text>
      <Text style={styles.toggleSubtitle}>{subtitle}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: "#E4E7EC", true: "#86EFAC" }}
      thumbColor={value ? GREEN_PRIMARY : "#F9FAFB"}
    />
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

export default function SettingsModals({
  visibleType,
  onClose,
  profile,
  employeeId,
  profileName,
  profilePhone,
  profileEmail,
  vehicleType,
  vehicleNumber,
  verificationStatusLabel,
  onUpdateAvailableChange
}: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [savingPref, setSavingPref] = useState<keyof DeliveryNotificationPreferences | null>(null);
  const [prefs, setPrefs] = useState<DeliveryNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [permissionLabel, setPermissionLabel] = useState("");
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  useEffect(() => {
    if (visibleType !== "notifications") return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [storedPrefs, permission] = await Promise.all([
          getNotificationPreferences(),
          getNotificationPermissionLabel()
        ]);
        if (!active) return;
        setPrefs(storedPrefs);
        setPermissionLabel(permission);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [visibleType]);

  useEffect(() => {
    if (visibleType !== "appVersion") return;

    let active = true;
    const load = async () => {
      setCheckingUpdate(true);
      try {
        const status = await checkAppUpdateStatus();
        if (!active) return;
        setUpdateStatus(status);
        onUpdateAvailableChange?.(status.updateAvailable);
      } finally {
        if (active) setCheckingUpdate(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [visibleType, onUpdateAvailableChange]);

  const updatePreference = async (key: keyof DeliveryNotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingPref(key);
    try {
      const saved = await persistNotificationPreferences(next);
      setPrefs(saved);
      if (key !== "vibrationEnabled" && value) {
        await registerForPushNotifications().catch(() => {});
        setPermissionLabel(await getNotificationPermissionLabel());
      }
    } finally {
      setSavingPref(null);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateStatus) return;

    if (updateStatus.otaUpdateAvailable) {
      setInstallingUpdate(true);
      try {
        const installed = await installOtaUpdate();
        if (!installed && updateStatus.storeUpdateAvailable) {
          await openAppStoreListing(updateStatus);
        }
      } finally {
        setInstallingUpdate(false);
      }
      return;
    }

    await openAppStoreListing(updateStatus);
  };

  const renderHeader = (title: string, subtitle: string) => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onClose} hitSlop={12}>
        <Ionicons name="close" size={24} color="#667085" />
      </TouchableOpacity>
    </View>
  );

  const renderNotifications = () => (
    <>
      {renderHeader("Notifications", "Choose which alerts you want on this device.")}
      {loading ? (
        <ActivityIndicator size="large" color={GREEN_PRIMARY} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
          <View style={styles.permissionCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={GREEN_DEEP} />
            <Text style={styles.permissionText}>{permissionLabel}</Text>
          </View>
          <TouchableOpacity style={styles.linkButton} onPress={openNotificationSettings}>
            <Ionicons name="settings-outline" size={18} color={GREEN_DEEP} />
            <Text style={styles.linkButtonText}>Open device notification settings</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <ToggleRow
              title="Jobs"
              subtitle="New delivery jobs, assignments, and verification updates"
              value={prefs.jobAlerts}
              onValueChange={(value) => updatePreference("jobAlerts", value)}
              disabled={savingPref === "jobAlerts"}
            />
            <ToggleRow
              title="Payouts"
              subtitle="Withdrawal approvals and wallet payout alerts"
              value={prefs.payoutAlerts}
              onValueChange={(value) => updatePreference("payoutAlerts", value)}
              disabled={savingPref === "payoutAlerts"}
            />
            <ToggleRow
              title="Promotions"
              subtitle="Partner campaigns and bonus announcements"
              value={prefs.promotionAlerts}
              onValueChange={(value) => updatePreference("promotionAlerts", value)}
              disabled={savingPref === "promotionAlerts"}
            />
            <ToggleRow
              title="Offers"
              subtitle="Limited-time earning boosts and incentives"
              value={prefs.offerAlerts}
              onValueChange={(value) => updatePreference("offerAlerts", value)}
              disabled={savingPref === "offerAlerts"}
            />
            <ToggleRow
              title="Vibrations"
              subtitle="Vibrate for in-app job alerts on this phone"
              value={prefs.vibrationEnabled}
              onValueChange={(value) => updatePreference("vibrationEnabled", value)}
              disabled={savingPref === "vibrationEnabled"}
            />
          </View>
        </ScrollView>
      )}
    </>
  );

  const renderProfileDetails = () => (
    <>
      {renderHeader("Profile details", "Your verified rider account information.")}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <View style={styles.profileHeroIcon}>
            <Ionicons name="person" size={28} color={GREEN_DEEP} />
          </View>
          <Text style={styles.profileHeroName}>{profileName || "Delivery Partner"}</Text>
          <Text style={styles.profileHeroMeta}>{employeeId}</Text>
        </View>
        <View style={styles.card}>
          <DetailRow label="Phone" value={profilePhone || "Not added"} />
          <DetailRow label="Email" value={profileEmail || "Not added"} />
          <DetailRow label="Vehicle" value={`${vehicleType}${vehicleNumber ? ` (${vehicleNumber})` : ""}`} />
          <DetailRow label="License number" value={profile?.licenseNumber || "Not added"} />
          <DetailRow label="Address" value={profile?.address || "Not added"} />
          <DetailRow label="Emergency contact" value={profile?.emergencyContactName || "Not added"} />
          <DetailRow label="Emergency phone" value={profile?.emergencyContactPhone || "Not added"} />
          <DetailRow label="Verification status" value={verificationStatusLabel} />
          <DetailRow label="Total deliveries" value={String(profile?.totalDeliveries || 0)} />
          <DetailRow label="Rating" value={`${(profile?.rating || 0).toFixed(1)} / 5`} />
        </View>
      </ScrollView>
    </>
  );

  const renderAppVersion = () => {
    const currentVersion = updateStatus?.currentVersion || getCurrentAppVersion();
    return (
      <>
        {renderHeader("App version", "Keep the delivery app updated for the best experience.")}
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }} showsVerticalScrollIndicator={false}>
          <View style={styles.versionCard}>
            <Ionicons name="phone-portrait-outline" size={28} color={GREEN_DEEP} />
            <Text style={styles.versionCurrent}>Installed version {currentVersion}</Text>
            <Text style={styles.versionLatest}>Latest available {updateStatus?.latestVersion || currentVersion}</Text>
            {checkingUpdate ? (
              <ActivityIndicator size="small" color={GREEN_PRIMARY} style={{ marginTop: 16 }} />
            ) : updateStatus?.updateAvailable ? (
              <View style={styles.updateBadge}>
                <Ionicons name="arrow-up-circle" size={18} color="#B45309" />
                <Text style={styles.updateBadgeText}>
                  {updateStatus.forceUpdate ? "Required update available" : "Update available"}
                </Text>
              </View>
            ) : (
              <View style={styles.upToDateBadge}>
                <Ionicons name="checkmark-circle" size={18} color={GREEN_DEEP} />
                <Text style={styles.upToDateText}>You are on the latest version</Text>
              </View>
            )}
          </View>

          {updateStatus?.updateAvailable ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleInstallUpdate} disabled={installingUpdate}>
              {installingUpdate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {updateStatus.otaUpdateAvailable ? "Install update" : "Update from store"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={async () => {
              setCheckingUpdate(true);
              try {
                const status = await checkAppUpdateStatus();
                setUpdateStatus(status);
                onUpdateAvailableChange?.(status.updateAvailable);
              } finally {
                setCheckingUpdate(false);
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Check again</Text>
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  };

  if (!visibleType) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {visibleType === "notifications" && renderNotifications()}
          {visibleType === "profile" && renderProfileDetails()}
          {visibleType === "appVersion" && renderAppVersion()}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end"
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1D2939"
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#667085"
  },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: GREEN_SOFT,
    marginBottom: 10
  },
  permissionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: GREEN_DEEP,
    fontWeight: "600"
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 12
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_DEEP
  },
  card: {
    borderWidth: 1,
    borderColor: "#E4E7EC",
    borderRadius: 18,
    overflow: "hidden"
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  toggleCopy: {
    flex: 1
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D2939"
  },
  toggleSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: "#667085"
  },
  profileHero: {
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 12
  },
  profileHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  profileHeroName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D2939"
  },
  profileHeroMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#667085",
    fontWeight: "600"
  },
  detailRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F7"
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#98A2B3",
    textTransform: "uppercase"
  },
  detailValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#1D2939"
  },
  versionCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    backgroundColor: "#F8FAFC",
    marginBottom: 16
  },
  versionCurrent: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "800",
    color: "#1D2939"
  },
  versionLatest: {
    marginTop: 6,
    fontSize: 13,
    color: "#667085"
  },
  updateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFBEB"
  },
  updateBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309"
  },
  upToDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: GREEN_SOFT
  },
  upToDateText: {
    fontSize: 13,
    fontWeight: "700",
    color: GREEN_DEEP
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: GREEN_PRIMARY,
    marginBottom: 10
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_DEEP
  }
});
