import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Linking
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDeliveryProfile, type DeliveryProfile } from "../api/profile.api";
import { deleteAccount, logout } from "../api/auth.api";

type MenuItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  rightText?: string;
  toggle?: boolean;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
};

type MenuSection = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: MenuItem[];
};

const PRIVACY_URL = "https://vyaha-official.onrender.com/privacy";
const TERMS_URL = "https://vyaha-official.onrender.com/terms";

export default function AccountProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [storedUser, setStoredUser] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailOffers, setEmailOffers] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [userJson, profileResponse] = await Promise.all([
          AsyncStorage.getItem("user"),
          getDeliveryProfile()
        ]);

        if (userJson) {
          setStoredUser(JSON.parse(userJson));
        }

        if (profileResponse.success && profileResponse.data) {
          setProfile(profileResponse.data);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const showComingSoon = (title: string) => {
    Alert.alert(title, "For help with this request, contact Vyaha support from your registered mobile number.");
  };

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This will deactivate your delivery login and anonymize profile, document, and address details where possible. Some payout, tax, or delivery records may be retained where required.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              navigation.getParent()?.reset({ index: 0, routes: [{ name: "Login" }] });
            } catch (error: any) {
              Alert.alert("Error", error.response?.data?.message || error.message || "Failed to delete account");
            }
          }
        }
      ]
    );
  };

  const displayName = profile?.name || storedUser?.name || "Delivery Partner";
  const phone = profile?.phone || storedUser?.phone || "Mobile number not added";
  const email = profile?.email || "Email ID not added";
  const membershipStatus = profile?.status === "ACTIVE" ? "Gold Partner" : profile?.status === "VERIFIED" ? "Verified" : "Member";
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "D";

  const sections = useMemo<MenuSection[]>(
    () => [
      {
        title: "Orders",
        icon: "cube-outline",
        items: [
          { title: "Current Orders", icon: "bag-handle-outline", onPress: () => navigation.navigate("MyJobs") },
          { title: "Order History", icon: "receipt-outline", onPress: () => showComingSoon("Order History") },
          { title: "Scheduled Orders", icon: "calendar-outline", onPress: () => showComingSoon("Scheduled Orders") },
          { title: "Reorder Favorites", icon: "repeat-outline", onPress: () => showComingSoon("Reorder Favorites") },
          { title: "Download Invoices", icon: "download-outline", onPress: () => showComingSoon("Download Invoices") }
        ]
      },
      {
        title: "Address Management",
        icon: "location-outline",
        items: [
          { title: "Home Address", icon: "home-outline", rightText: profile?.address ? "Saved" : "Add", onPress: () => showComingSoon("Home Address") },
          { title: "Work Address", icon: "business-outline", onPress: () => showComingSoon("Work Address") },
          { title: "Other Saved Places", icon: "map-outline", onPress: () => showComingSoon("Other Saved Places") },
          { title: "Add New Address", icon: "add-circle-outline", onPress: () => showComingSoon("Add New Address") },
          { title: "Default Delivery Address", icon: "navigate-outline", rightText: "Map pin", onPress: () => showComingSoon("Map Pin") }
        ]
      },
      {
        title: "Payments & Wallet",
        icon: "wallet-outline",
        items: [
          { title: "Saved Cards", icon: "card-outline", onPress: () => showComingSoon("Saved Cards") },
          { title: "UPI IDs", icon: "phone-portrait-outline", onPress: () => showComingSoon("UPI IDs") },
          { title: "Wallet Balance", icon: "wallet-outline", rightText: "Rs 0", onPress: () => showComingSoon("Wallet Balance") },
          { title: "Gift Cards", icon: "gift-outline", onPress: () => showComingSoon("Gift Cards") },
          { title: "Refund History", icon: "refresh-circle-outline", onPress: () => showComingSoon("Refund History") },
          { title: "Payment Methods", icon: "cash-outline", onPress: () => showComingSoon("Payment Methods") },
          { title: "Preferred Payment", icon: "checkmark-circle-outline", rightText: "Auto", onPress: () => showComingSoon("Preferred Payment") }
        ]
      },
      {
        title: "Offers & Memberships",
        icon: "pricetag-outline",
        items: [
          { title: "Coupons", icon: "ticket-outline", onPress: () => showComingSoon("Coupons") },
          { title: "Rewards Points", icon: "ribbon-outline", rightText: "0 pts", onPress: () => showComingSoon("Rewards Points") },
          { title: "Membership Plans", icon: "medal-outline", rightText: membershipStatus, onPress: () => showComingSoon("Membership Plans") },
          { title: "Referral Earnings", icon: "people-outline", onPress: () => showComingSoon("Referral Earnings") },
          { title: "Cashback History", icon: "sparkles-outline", onPress: () => showComingSoon("Cashback History") }
        ]
      },
      {
        title: "Favorites",
        icon: "heart-outline",
        items: [
          { title: "Favorite Restaurants", icon: "restaurant-outline", onPress: () => showComingSoon("Favorite Restaurants") },
          { title: "Saved Dishes", icon: "fast-food-outline", onPress: () => showComingSoon("Saved Dishes") },
          { title: "Recently Ordered Items", icon: "time-outline", onPress: () => showComingSoon("Recently Ordered Items") },
          { title: "Wishlist", icon: "bookmark-outline", onPress: () => showComingSoon("Wishlist") }
        ]
      },
      {
        title: "Notifications & Preferences",
        icon: "settings-outline",
        items: [
          { title: "Push Notifications", icon: "notifications-outline", toggle: true, value: pushEnabled, onToggle: setPushEnabled },
          { title: "SMS Updates", icon: "chatbubble-outline", toggle: true, value: smsEnabled, onToggle: setSmsEnabled },
          { title: "Email Offers", icon: "mail-outline", toggle: true, value: emailOffers, onToggle: setEmailOffers },
          { title: "Language Selection", icon: "language-outline", rightText: "English", onPress: () => showComingSoon("Language Selection") },
          { title: "Dark Mode", icon: "moon-outline", toggle: true, value: darkMode, onToggle: setDarkMode },
          { title: "Delivery Instructions Preference", icon: "document-text-outline", onPress: () => showComingSoon("Delivery Instructions") }
        ]
      },
      {
        title: "Support & Safety",
        icon: "shield-checkmark-outline",
        items: [
          { title: "Help Center", icon: "help-circle-outline", onPress: () => showComingSoon("Help Center") },
          { title: "Live Chat", icon: "chatbubbles-outline", onPress: () => showComingSoon("Live Chat") },
          { title: "Report Issue", icon: "alert-circle-outline", onPress: () => showComingSoon("Report Issue") },
          { title: "Refund Support", icon: "return-down-back-outline", onPress: () => showComingSoon("Refund Support") },
          { title: "Emergency Support", icon: "call-outline", onPress: () => showComingSoon("Emergency Support") },
          { title: "FAQ", icon: "reader-outline", onPress: () => showComingSoon("FAQ") }
        ]
      },
      {
        title: "Legal & Information",
        icon: "information-circle-outline",
        items: [
          { title: "Terms & Conditions", icon: "document-outline", onPress: () => Linking.openURL(TERMS_URL) },
          { title: "Privacy Policy", icon: "lock-closed-outline", onPress: () => Linking.openURL(PRIVACY_URL) },
          { title: "Cancellation Policy", icon: "close-circle-outline", onPress: () => showComingSoon("Cancellation Policy") },
          { title: "About App", icon: "apps-outline", onPress: () => showComingSoon("About App") },
          { title: "App Version", icon: "phone-portrait-outline", rightText: "1.0.0", onPress: () => showComingSoon("App Version") }
        ]
      },
      {
        title: "Account Actions",
        icon: "person-circle-outline",
        items: [
          { title: "Switch Account", icon: "swap-horizontal-outline", onPress: handleLogout },
          { title: "Change Mobile Number", icon: "call-outline", onPress: () => showComingSoon("Change Mobile Number") },
          { title: "Logout", icon: "log-out-outline", onPress: handleLogout },
          { title: "Delete Account", icon: "trash-outline", danger: true, onPress: handleDeleteAccount }
        ]
      }
    ],
    [darkMode, emailOffers, membershipStatus, navigation, profile?.address, pushEnabled, smsEnabled]
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {profile?.profilePhotoUrl ? (
            <Image source={{ uri: profile.profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.meta} numberOfLines={1}>+91 {phone}</Text>
          <Text style={styles.meta} numberOfLines={1}>{email}</Text>
          <View style={styles.membershipBadge}>
            <Ionicons name="ribbon-outline" size={14} color="#166534" />
            <Text style={styles.membershipText}>{membershipStatus}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => showComingSoon("Edit Profile")} accessibilityLabel="Edit profile">
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name={section.icon} size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <View style={styles.sectionBody}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.title}
                style={[styles.menuRow, index === section.items.length - 1 && styles.menuRowLast]}
                onPress={item.toggle ? undefined : item.onPress}
                activeOpacity={item.toggle ? 1 : 0.75}
              >
                <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
                  <Ionicons name={item.icon} size={18} color={item.danger ? "#DC2626" : "#4B5563"} />
                </View>
                <Text style={[styles.menuTitle, item.danger && styles.menuTitleDanger]} numberOfLines={1}>{item.title}</Text>
                {item.toggle ? (
                  <Switch
                    value={Boolean(item.value)}
                    onValueChange={item.onToggle}
                    trackColor={{ false: "#D1D5DB", true: "#BBF7D0" }}
                    thumbColor={item.value ? "#4CAF50" : "#F9FAFB"}
                  />
                ) : (
                  <>
                    {item.rightText ? <Text style={styles.rightText} numberOfLines={1}>{item.rightText}</Text> : null}
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA"
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FA"
  },
  loadingText: {
    marginTop: 12,
    color: "#667085",
    fontSize: 15
  },
  header: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#DCFCE7"
  },
  avatar: {
    width: "100%",
    height: "100%"
  },
  avatarText: {
    color: "#166534",
    fontSize: 28,
    fontWeight: "800"
  },
  headerInfo: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "800"
  },
  meta: {
    marginTop: 4,
    color: "#667085",
    fontSize: 13
  },
  membershipBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#ECFDF3"
  },
  membershipText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800"
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50"
  },
  section: {
    marginHorizontal: 16,
    marginTop: 12
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800"
  },
  sectionBody: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F7"
  },
  menuRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  menuRowLast: {
    borderBottomWidth: 0
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6"
  },
  menuIconDanger: {
    backgroundColor: "#FEF2F2"
  },
  menuTitle: {
    flex: 1,
    minWidth: 0,
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "600"
  },
  menuTitleDanger: {
    color: "#DC2626"
  },
  rightText: {
    maxWidth: 120,
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700"
  }
});
