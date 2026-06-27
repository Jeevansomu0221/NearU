import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from "react-native";
import type { UpiApp } from "../utils/upiPayment";

type Props = {
  visible: boolean;
  loading: boolean;
  apps: UpiApp[];
  selectedAppId?: string;
  totalLabel: string;
  onClose: () => void;
  onSelect: (app: UpiApp) => void;
};

const getAppInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function UpiAppPicker({
  visible,
  loading,
  apps,
  selectedAppId,
  totalLabel,
  onClose,
  onSelect
}: Props) {
  const recommendedApps = apps.slice(0, 4);
  const otherApps = apps.slice(4);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Bill total: {totalLabel}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#FF6B35" />
              <Text style={styles.loadingText}>Finding UPI apps on your phone...</Text>
            </View>
          ) : apps.length === 0 ? (
            <View style={styles.loadingState}>
              <Text style={styles.emptyTitle}>No UPI apps found</Text>
              <Text style={styles.emptyText}>
                Install Google Pay, PhonePe, or Paytm to pay online, or switch to Cash on Delivery.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {recommendedApps.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Recommended</Text>
                  {recommendedApps.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={[styles.appRow, selectedAppId === app.id && styles.appRowSelected]}
                      onPress={() => onSelect(app)}
                    >
                      <View style={styles.appBadge}>
                        <Text style={styles.appBadgeText}>{getAppInitials(app.name)}</Text>
                      </View>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {otherApps.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Pay by any UPI app</Text>
                  {otherApps.map((app) => (
                    <TouchableOpacity
                      key={app.id}
                      style={[styles.appRow, selectedAppId === app.id && styles.appRowSelected]}
                      onPress={() => onSelect(app)}
                    >
                      <View style={styles.appBadge}>
                        <Text style={styles.appBadgeText}>{getAppInitials(app.name)}</Text>
                      </View>
                      <Text style={styles.appName}>{app.name}</Text>
                      <Text style={styles.chevron}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)"
  },
  sheet: {
    maxHeight: "82%",
    backgroundColor: "#F7F3EE",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2C2018"
  },
  closeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6B35"
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#7B6D63",
    textAlign: "center"
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2C2018",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#7B6D63",
    textAlign: "center"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5DA",
    marginBottom: 12,
    overflow: "hidden"
  },
  sectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8B6A54"
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3ECE4"
  },
  appRowSelected: {
    backgroundColor: "#FFF4EC"
  },
  appBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4EC",
    marginRight: 12
  },
  appBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FF6B35"
  },
  appName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#2C2018"
  },
  chevron: {
    fontSize: 22,
    color: "#B8AAA0"
  }
});
