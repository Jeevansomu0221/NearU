import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import { resolveDeliveryRoute } from "../utils/deliveryStatus";

const statusContent: Record<DeliveryProfile["status"], { title: string; body: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING: {
    title: "Verification In Progress",
    body: "Your documents were submitted successfully. Please wait until our team reviews and approves your registration.",
    color: "#B54708",
    bg: "#FFF4E5",
    icon: "time-outline"
  },
  VERIFIED: {
    title: "Verified By Team",
    body: "Your documents look good. Please wait a little longer while your rider account is activated.",
    color: "#175CD3",
    bg: "#EFF8FF",
    icon: "shield-checkmark-outline"
  },
  ACTIVE: {
    title: "Account Active",
    body: "Your rider account is active now. You can start taking delivery jobs.",
    color: "#027A48",
    bg: "#ECFDF3",
    icon: "checkmark-circle-outline"
  },
  REJECTED: {
    title: "Changes Needed",
    body: "Your registration was reviewed and some details need to be updated. Please re-upload the requested documents and submit again.",
    color: "#B42318",
    bg: "#FEF3F2",
    icon: "close-circle-outline"
  },
  SUSPENDED: {
    title: "Account Suspended",
    body: "Your rider account is temporarily suspended. Please contact the admin team for help.",
    color: "#B42318",
    bg: "#FEF3F2",
    icon: "alert-circle-outline"
  },
  INACTIVE: {
    title: "Registration Incomplete",
    body: "Please complete your rider registration and upload the required documents to continue.",
    color: "#475467",
    bg: "#F2F4F7",
    icon: "document-text-outline"
  }
};

export default function ReviewStatusScreen({ navigation }: any) {
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const syncProfile = async (showLoader = false) => {
    try {
      if (showLoader) setRefreshing(true);
      const response = await getDeliveryProfile();

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load profile");
      }

      const nextProfile = response.data;
      setProfile(nextProfile);

      const nextRoute = resolveDeliveryRoute(nextProfile);
      if (nextRoute === "Main") {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
        return;
      }

      if (nextRoute === "CompleteProfile") {
        navigation.reset({ index: 0, routes: [{ name: "CompleteProfile" }] });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load profile status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    syncProfile();
  }, []);

  const content = useMemo(() => statusContent[profile?.status || "INACTIVE"], [profile]);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Checking your registration status...</Text>
      </View>
    );
  }

  const showReupload = profile?.status === "REJECTED" || profile?.status === "INACTIVE";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: content.bg }]}>
        <Ionicons name={content.icon} size={56} color={content.color} />
        <Text style={[styles.title, { color: content.color }]}>{content.title}</Text>
        <Text style={styles.body}>{content.body}</Text>
        {profile?.reviewComment ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Admin message</Text>
            <Text style={styles.noteText}>{profile.reviewComment}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current status</Text>
        <Text style={styles.sectionValue}>{profile?.status || "INACTIVE"}</Text>
      </View>

      {showReupload ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("CompleteProfile")}>
          <Text style={styles.primaryButtonText}>Update Registration</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => syncProfile(true)} disabled={refreshing}>
        {refreshing ? <ActivityIndicator size="small" color="#FF6B35" /> : <Text style={styles.secondaryButtonText}>Refresh Status</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={handleLogout}>
        <Text style={styles.linkButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#FFF8F4"
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F4",
    padding: 24
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#475467"
  },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center"
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center"
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    color: "#344054"
  },
  noteBox: {
    width: "100%",
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B42318",
    textTransform: "uppercase"
  },
  noteText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: "#344054"
  },
  section: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF"
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#667085",
    textTransform: "uppercase"
  },
  sectionValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#101828"
  },
  primaryButton: {
    marginTop: 18,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FF6B35"
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F2B29B"
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF6B35"
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center"
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#667085"
  }
});
